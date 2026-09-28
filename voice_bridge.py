#!/usr/bin/env python3
"""Small offline Vosk/ALSA bridge intended for Raspberry Pi 3."""

import json
import os
import select
import subprocess
import sys
import time

try:
    from vosk import KaldiRecognizer, Model, SetLogLevel
except ImportError as error:
    print(f"[bridge] Cannot import vosk: {error}", file=sys.stderr, flush=True)
    sys.exit(1)

SAMPLE_RATE = 16000
CHUNK_BYTES = 4000
MODEL_PATH = os.environ.get(
    "VOSK_MODEL_PATH", os.path.join(os.path.dirname(__file__), "models", "vn")
)

# Unicode escapes keep the source portable when copied by older tools.
GRAMMAR = [
    "l\u0103ng c\u00e1 \u00f4ng",
    "l\u00e0ng c\u00e1 \u00f4ng",
    "l\u0103ng ng\u01b0 \u00f4ng nam \u00f4",
    "\u0111\u00ecnh l\u00e0ng",
    "\u0111\u00ecnh l\u00e0ng nam \u00f4",
    "mi\u1ebfu b\u00e0 huy\u1ec1n tr\u00e2n",
    "dinh \u00e2m h\u1ed3n",
    "dinh c\u00f4 h\u1ed3n",
    "mi\u1ebfu \u00e2m linh",
    "gi\u1ebfng vu\u00f4ng",
    "gi\u1ebfng ch\u0103m",
    "gh\u1ec1nh nam \u00f4",
    "r\u1ea1n nam \u00f4",
    "n\u01b0\u1edbc m\u1eafm nam \u00f4",
    "n\u01b0\u1edbc m\u1eafm",
    "[unk]",
]


def make_recognizer(model):
    grammar_json = json.dumps(GRAMMAR, ensure_ascii=False)
    recognizer = KaldiRecognizer(model, SAMPLE_RATE, grammar_json)
    recognizer.SetWords(False)
    return recognizer


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
        recorder = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    except FileNotFoundError:
        print("[bridge] arecord is missing; install alsa-utils", file=sys.stderr, flush=True)
        return 1

    print(f"[bridge] Listening on ALSA device: {device}", file=sys.stderr, flush=True)
    paused = False
    last_partial = ""
    partial_since = 0.0

    try:
        while recorder.poll() is None:
            control = read_command()
            if control == "PAUSE":
                paused = True
                recognizer.Reset()
                last_partial = ""
            elif control == "RESUME":
                paused = False
                recognizer.Reset()
                last_partial = ""

            data = recorder.stdout.read(CHUNK_BYTES)
            if not data:
                break
            if paused:
                continue

            if recognizer.AcceptWaveform(data):
                recognized_text = json.loads(recognizer.Result()).get("text", "").strip()
                if recognized_text and recognized_text != "[unk]":
                    print(f"FINAL: {recognized_text}", flush=True)
                last_partial = ""
            else:
                partial = json.loads(recognizer.PartialResult()).get("partial", "").strip()
                now = time.monotonic()
                if partial != last_partial:
                    last_partial = partial
                    partial_since = now
                elif partial in GRAMMAR and now - partial_since >= 0.55:
                    print(f"FINAL: {partial}", flush=True)
                    recognizer.Reset()
                    last_partial = ""
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
