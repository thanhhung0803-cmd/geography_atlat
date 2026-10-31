#!/usr/bin/env python3
"""Small offline Vosk/ALSA bridge intended for Raspberry Pi 3."""

import json
import os
import select
import statistics
import struct
import subprocess
import sys
import time
import unicodedata

try:
    from vosk import KaldiRecognizer, Model, SetLogLevel
except ImportError as error:
    print(f"[bridge] Cannot import vosk: {error}", file=sys.stderr, flush=True)
    sys.exit(1)

SAMPLE_RATE = 16000
CHUNK_BYTES = 4000
MIN_RMS = int(os.environ.get("VOSK_MIN_RMS", "900"))
FIXED_RMS = os.environ.get("VOSK_FIXED_RMS")
DEBUG_AUDIO = os.environ.get("VOSK_DEBUG", "1") != "0"
VOICE_START_FRAMES = 1
SILENCE_END_FRAMES = 6
MIN_SPEECH_FRAMES = 4
CALIBRATION_FRAMES = 16
MODEL_PATH = os.environ.get(
    "VOSK_MODEL_PATH", os.path.join(os.path.dirname(__file__), "models", "vn")
)

# Visitors still say the full place name. Short, distinctive anchors are also
# in the grammar because the small Vietnamese model recognizes two-word units
# more reliably on a Pi 3. Every anchor is returned as its full canonical name.
COMMANDS = [
    (
        "mi\u1ebfu b\u00e0 huy\u1ec1n tr\u00e2n",
        ["mi\u1ebfu b\u00e0 huy\u1ec1n tr\u00e2n", "mi\u1ebfu b\u00e0", "huy\u1ec1n tr\u00e2n"],
    ),
    ("gh\u1ec1nh nam \u00f4", ["gh\u1ec1nh nam \u00f4", "gh\u1ec1nh nam"]),
    ("l\u00e0ng c\u00e1 \u00f4ng", ["l\u00e0ng c\u00e1 \u00f4ng", "l\u00e0ng c\u00e1", "c\u00e1 \u00f4ng"]),
    ("gi\u1ebfng vu\u00f4ng", ["gi\u1ebfng vu\u00f4ng", "gi\u1ebfng ch\u0103m"]),
    (
        "dinh \u00e2m h\u1ed3n",
        [
            "dinh \u00e2m h\u1ed3n",
            "dinh c\u00f4 h\u1ed3n",
            "dinh h\u1ed3n",
            "\u00e2m h\u1ed3n",
            "\u00e2m linh",
        ],
    ),
    ("n\u01b0\u1edbc m\u1eafm nam \u00f4", ["n\u01b0\u1edbc m\u1eafm nam \u00f4", "n\u01b0\u1edbc m\u1eafm"]),
    ("\u0111\u00ecnh l\u00e0ng", ["\u0111\u00ecnh l\u00e0ng"]),
]
ALIASES = list(dict.fromkeys(alias for _, aliases in COMMANDS for alias in aliases))
GRAMMAR = ALIASES + ["[unk]"]


def normalize(text):
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = text.replace("\u0111", "d")
    return " ".join(text.split())


def rms_level(data):
    """Return the RMS level of a mono signed 16-bit PCM chunk."""
    sample_count = len(data) // 2
    if sample_count == 0:
        return 0.0
    samples = struct.unpack(f"<{sample_count}h", data[: sample_count * 2])
    return (sum(sample * sample for sample in samples) / sample_count) ** 0.5


def match_command(text):
    """Map a full phrase or a distinctive two-word anchor to its canonical name."""
    heard = f" {normalize(text)} "
    matches = []
    for command, aliases in COMMANDS:
        for alias in aliases:
            normalized_alias = normalize(alias)
            if f" {normalized_alias} " in heard:
                matches.append((len(normalized_alias.split()), len(normalized_alias), command))
    if matches:
        # Prefer the most specific match when the recognizer adds extra words.
        return max(matches)[2]
    return None


def make_recognizer(model):
    # Restrict recognition to the destination phrases for better Vietnamese
    # keyword accuracy; the RMS gate below keeps silence/noise out of Vosk.
    grammar_json = json.dumps(GRAMMAR, ensure_ascii=False)
    recognizer = KaldiRecognizer(model, SAMPLE_RATE, grammar_json)
    recognizer.SetWords(True)
    # Wait through short pauses between Vietnamese words instead of returning
    # fragments such as "ba", "linh" or "hon" as separate utterances.
    if hasattr(recognizer, "SetEndpointerDelays"):
        recognizer.SetEndpointerDelays(5.0, 1.4, 15.0)
    return recognizer


def result_confidence(result):
    words = result.get("result") or []
    confidences = [float(word.get("conf", 0.0)) for word in words]
    return sum(confidences) / len(confidences) if confidences else 0.0


def read_command():
    """Return one pending stdin command without blocking audio processing."""
    readable, _, _ = select.select([sys.stdin], [], [], 0)
    if not readable:
        return None
    line = sys.stdin.readline()
    return line.strip().upper() if line else None


def main():
    if not os.path.isdir(MODEL_PATH):
        print(f"[bridge] Missing Vosk model: {MODEL_PATH}", file=sys.stderr, flush=True)
        return 1

    SetLogLevel(-1)
    try:
        model = Model(MODEL_PATH)
        recognizer = make_recognizer(model)
    except Exception as error:
        print(f"[bridge] Cannot load model: {error}", file=sys.stderr, flush=True)
        return 1

    device = os.environ.get("VOSK_AUDIO_DEVICE", "default")
    command = [
        "arecord", "-q", "-D", device, "-f", "S16_LE", "-r", str(SAMPLE_RATE),
        "-c", "1", "-t", "raw",
    ]
    try:
        recorder = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=sys.stderr)
    except FileNotFoundError:
        print("[bridge] arecord is missing; install alsa-utils", file=sys.stderr, flush=True)
        return 1

    print(
        f"[bridge] Calibrating microphone noise on ALSA device: {device}; keep quiet...",
        file=sys.stderr,
        flush=True,
    )
    paused = False
    last_emitted_at = {}
    last_any_emitted_at = 0.0
    voice_active = False
    voice_start_count = 0
    silence_count = 0
    speech_frame_count = 0
    start_chunks = []
    calibration_levels = []
    effective_min_rms = float(MIN_RMS)
    sustain_min_rms = float(MIN_RMS)
    last_rms_log_at = 0.0
    last_debug_partial = ""

    def emit(command_match, speech_frames, from_partial=False):
        nonlocal last_any_emitted_at
        if not command_match:
            return False
        if speech_frames < MIN_SPEECH_FRAMES:
            print(
                f"[bridge] Rejected short command: speech_frames={speech_frames}",
                file=sys.stderr,
                flush=True,
            )
            return False
        now = time.monotonic()
        # Prevent one noisy utterance from cascading through several places.
        if now - last_any_emitted_at < 1.25:
            return False
        if now - last_emitted_at.get(command_match, 0.0) < 3.0:
            return False
        last_emitted_at[command_match] = now
        last_any_emitted_at = now
        if from_partial:
            print(
                f"[bridge] Accepted keyword from partial: {command_match}",
                file=sys.stderr,
                flush=True,
            )
        print(f"FINAL: {command_match}", flush=True)
        return True

    try:
        while recorder.poll() is None:
            now = time.monotonic()
            control = read_command()
            if control == "PAUSE":
                paused = True
                recognizer.Reset()
                voice_active = False
                speech_frame_count = 0
                start_chunks = []
                last_debug_partial = ""
            elif control == "RESUME":
                paused = False
                recognizer.Reset()
                voice_active = False
                speech_frame_count = 0
                start_chunks = []
                last_debug_partial = ""

            data = recorder.stdout.read(CHUNK_BYTES)
            if not data:
                break
            if paused:
                continue

            level = rms_level(data)
            if len(calibration_levels) < CALIBRATION_FRAMES:
                calibration_levels.append(level)
                if len(calibration_levels) == CALIBRATION_FRAMES:
                    noise_floor = statistics.median(calibration_levels)
                    deviations = [abs(value - noise_floor) for value in calibration_levels]
                    noise_deviation = statistics.median(deviations)
                    # Stay above normal noise variation without requiring the
                    # user's voice to be three times louder than the room.
                    # Start slightly above the measured floor. Requiring a
                    # minimum duration and confidence handles short noise peaks.
                    margin = max(180.0, noise_floor * 0.12, noise_deviation * 1.5)
                    margin = min(margin, noise_floor * 0.3)
                    effective_min_rms = (
                        float(FIXED_RMS)
                        if FIXED_RMS is not None
                        else max(float(MIN_RMS), noise_floor + margin)
                    )
                    # Once speech starts, keep quieter Vietnamese syllables by
                    # using a lower continuation threshold (hysteresis).
                    sustain_min_rms = max(
                        float(MIN_RMS),
                        noise_floor + max(100.0, noise_deviation * 0.75),
                    )
                    sustain_min_rms = min(sustain_min_rms, effective_min_rms * 0.92)
                    sustain_min_rms = max(sustain_min_rms, noise_floor + 80.0)
                    print(
                        f"[bridge] Listening; noise RMS: {noise_floor:.0f}; "
                        f"noise variation: {noise_deviation:.0f}; "
                        f"start threshold: {effective_min_rms:.0f}; "
                        f"sustain threshold: {sustain_min_rms:.0f}; "
                        "keyword mode enabled",
                        file=sys.stderr,
                        flush=True,
                    )
                continue

            if DEBUG_AUDIO and now - last_rms_log_at >= 1.0:
                state = "VOICE" if level >= effective_min_rms else "noise"
                print(
                    f"[bridge] Input RMS={level:.0f}, threshold={effective_min_rms:.0f}, "
                    f"state={state}",
                    file=sys.stderr,
                    flush=True,
                )
                last_rms_log_at = now

            if not voice_active:
                if level < effective_min_rms:
                    voice_start_count = 0
                    start_chunks = []
                    continue
                voice_start_count += 1
                start_chunks.append(data)
                if voice_start_count < VOICE_START_FRAMES:
                    continue
                # Include the first loud chunk so the first syllable is kept.
                data = b"".join(start_chunks)
                start_chunks = []
                voice_start_count = 0
                voice_active = True
                silence_count = 0
                speech_frame_count = VOICE_START_FRAMES
                last_debug_partial = ""
                if DEBUG_AUDIO:
                    print(
                        f"[bridge] Voice detected: RMS={level:.0f}",
                        file=sys.stderr,
                        flush=True,
                    )
            elif level < sustain_min_rms:
                silence_count += 1
            else:
                silence_count = 0
                speech_frame_count += 1

            if recognizer.AcceptWaveform(data):
                result = json.loads(recognizer.Result())
                recognized_text = result.get("text", "").strip()
                command_match = match_command(recognized_text)
                confidence = result_confidence(result)
                print(
                    f"[bridge] Heard final: '{recognized_text}' "
                    f"confidence={confidence:.2f}, speech_frames={speech_frame_count}",
                    file=sys.stderr,
                    flush=True,
                )
                emitted = emit(command_match, speech_frame_count)
                if (
                    not emitted
                    and not command_match
                    and recognized_text
                    and recognized_text != "[unk]"
                ):
                    print(
                        f"[bridge] Ignored incomplete phrase: {recognized_text}",
                        file=sys.stderr,
                        flush=True,
                    )
                voice_active = False
                silence_count = 0
                speech_frame_count = 0
                last_debug_partial = ""
            else:
                partial_text = json.loads(recognizer.PartialResult()).get("partial", "").strip()
                if DEBUG_AUDIO and partial_text and partial_text != last_debug_partial:
                    print(
                        f"[bridge] Heard partial: '{partial_text}'",
                        file=sys.stderr,
                        flush=True,
                    )
                    last_debug_partial = partial_text
                partial_match = match_command(partial_text)
                if emit(
                    partial_match,
                    speech_frames=speech_frame_count,
                    from_partial=True,
                ):
                    recognizer.Reset()
                    voice_active = False
                    silence_count = 0
                    speech_frame_count = 0
                    last_debug_partial = ""

            if voice_active and silence_count >= SILENCE_END_FRAMES:
                result = json.loads(recognizer.FinalResult())
                final_text = result.get("text", "").strip()
                confidence = result_confidence(result)
                print(
                    f"[bridge] Heard final: '{final_text}' "
                    f"confidence={confidence:.2f}, speech_frames={speech_frame_count}",
                    file=sys.stderr,
                    flush=True,
                )
                emit(
                    match_command(final_text),
                    speech_frame_count,
                )
                recognizer.Reset()
                voice_active = False
                silence_count = 0
                speech_frame_count = 0
                last_debug_partial = ""
    except (KeyboardInterrupt, BrokenPipeError):
        pass
    finally:
        recorder.terminate()
        try:
            recorder.wait(timeout=2)
        except subprocess.TimeoutExpired:
            recorder.kill()
    return 0


if __name__ == "__main__":
    sys.exit(main())
