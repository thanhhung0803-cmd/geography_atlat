#!/usr/bin/env python3
"""voice_bridge.py
Đơn giản hóa: chỉ dùng arecord (ALSA) + vosk để nhận dạng tiếng Việt.

STDOUT dòng dạng:
    FINAL: <cau da nhan dang>

Yêu cầu:
    sudo apt update && sudo apt install -y alsa-utils python3-pip python3-full
    python3 -m venv venv && source venv/bin/activate
    pip install vosk

Model: giải nén vào ./models/vn
    wget https://alphacephei.com/vosk/models/vosk-model-small-vn-0.4.zip
    unzip vosk-model-small-vn-0.4.zip -d models && mv models/vosk-model-small-vn-0.4 models/vn

Không dùng sounddevice / PortAudio để giảm phụ thuộc.

Thêm VAD đơn giản dựa trên năng lượng để phát hiện START/END khối lời nói:
    START: <timestamp_ms>
    END: <timestamp_ms>
Khi ổn định cụm từ sẽ in FINAL: <text>.
"""
import sys
import json
import queue
import threading
import os
import time
import struct

try:
    from vosk import Model, KaldiRecognizer, SetLogLevel
except Exception as e:
    print(f"[bridge] Vosk import error: {e}", file=sys.stderr)
    sys.exit(1)

SAMPLE_RATE = 16000
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'vn')

if not os.path.isdir(MODEL_PATH):
    print(f"[bridge] Missing model directory: {MODEL_PATH}", file=sys.stderr)
    sys.exit(0)

try:
    model = Model(MODEL_PATH)
except Exception as e:
    print(f"[bridge] Model load error: {e}", file=sys.stderr)
    sys.exit(1)

GRAMMAR = [
    "lang ngu ong nam o",
    "lang ca ong",
    "lang ong",
    "dinh lang nam o",
    "dinh nam o",
    "mieu ba huyen tran",
    "dinh ba huyen tran",
    "mieu ba lieu hanh",
    "dinh co hon nam o",
    "mieu am linh",
    "gieng cham co nam o",
    "gieng lang",
    "gieng vuong",
    "ghenh nam o",
    "ran nam o",
    "lang nghe nuoc mam nam o",
    "nuoc mam nam o",
    "lang nuoc mam nam o",
    "goi ca nam o",
    "goi ca"
]

try:
    SetLogLevel(-1)  # silence internal Vosk logs
except Exception:
    pass

# Use grammar to restrict search space (improves short phrase reliability)
rec = KaldiRecognizer(model, SAMPLE_RATE, json.dumps(GRAMMAR))
rec.SetWords(True)

audio_q = queue.Queue()
energy_q = queue.Queue()

# Global pause flag - when True, skip audio processing
is_paused = False

def stdin_reader():
    """Read commands from stdin: PAUSE or RESUME"""
    global is_paused
    for line in sys.stdin:
        cmd = line.strip().upper()
        if cmd == 'PAUSE':
            is_paused = True
            print('[bridge] PAUSED - ignoring audio input', file=sys.stderr)
            sys.stderr.flush()
        elif cmd == 'RESUME':
            is_paused = False
            print('[bridge] RESUMED - processing audio', file=sys.stderr)
            sys.stderr.flush()

def enqueue_chunk(data: bytes):
    audio_q.put(data)
    energy_q.put(data)

def worker():
    last_partial = ""
    last_partial_time = 0.0
    PARTIAL_STABLE_MS = 600  # Increase from 400 to 600ms for more stability
    while True:
        data = audio_q.get()
        
        # Skip processing if paused
        if is_paused:
            continue
        
        if rec.AcceptWaveform(data):
            try:
                result = json.loads(rec.Result())
            except json.JSONDecodeError:
                continue
            text = (result.get('text') or '').strip()
            if text:
                print(f"FINAL: {text}")
                sys.stdout.flush()
            # reset partial tracking
            last_partial = ""
            last_partial_time = 0.0
        else:
            try:
                part = json.loads(rec.PartialResult()).get('partial','').strip()
            except json.JSONDecodeError:
                part = ""
            if part:
                now = time.time()
                if part == last_partial:
                    # stable?
                    if (now - last_partial_time) * 1000 >= PARTIAL_STABLE_MS:
                        print(f"FINAL: {part}")
                        sys.stdout.flush()
                        # prevent immediate re-fire
                        last_partial_time = now + 10
                else:
                    last_partial = part
                    last_partial_time = now
                # Optional: emit PARTIAL for debugging (comment out if noisy)
                # print(f"PARTIAL: {part}")
                # sys.stdout.flush()

def vad_worker():
    FRAME_MS = 250  # analyze in 250ms windows
    SILENCE_THRESHOLD = 1000  # Increase from 800 to 1000 to reduce noise sensitivity
    SILENCE_FRAMES_END = 8   # Increase from 6 to 8 (~2s of silence)
    VOICE_FRAMES_START = 3   # Increase from 2 to 3 frames to confirm voice

    buf = b''
    in_speech = False
    silence_count = 0
    voice_count = 0
    while True:
        chunk = energy_q.get()
        
        # Skip VAD processing if paused
        if is_paused:
            # Reset state when paused
            if in_speech:
                in_speech = False
                silence_count = 0
                voice_count = 0
            continue
        
        buf += chunk
        # Process in windows of FRAME_MS
        bytes_per_frame = int(SAMPLE_RATE * (FRAME_MS/1000.0)) * 2  # 16-bit mono
        while len(buf) >= bytes_per_frame:
            frame = buf[:bytes_per_frame]
            buf = buf[bytes_per_frame:]
            # Compute RMS energy
            samples = struct.unpack('<' + 'h'*(len(frame)//2), frame)
            rms = (sum(s*s for s in samples) / len(samples)) ** 0.5
            now_ms = int(time.time()*1000)
            if rms > SILENCE_THRESHOLD:
                if not in_speech:
                    voice_count += 1
                    if voice_count >= VOICE_FRAMES_START:
                        in_speech = True
                        print(f"START: {now_ms}")
                        sys.stdout.flush()
                        voice_count = 0
                else:
                    silence_count = 0
            else:
                voice_count = 0
                if in_speech:
                    silence_count += 1
                    if silence_count >= SILENCE_FRAMES_END:
                        in_speech = False
                        silence_count = 0
                        print(f"END: {now_ms}")
                        sys.stdout.flush()

def main():
    import subprocess
    print('[bridge] Bắt đầu ghi âm qua arecord + vosk...', file=sys.stderr)
    
    # Start stdin reader for PAUSE/RESUME commands
    t_stdin = threading.Thread(target=stdin_reader, daemon=True)
    t_stdin.start()
    
    t = threading.Thread(target=worker, daemon=True)
    t.start()
    t_vad = threading.Thread(target=vad_worker, daemon=True)
    t_vad.start()
    cmd = ['arecord','-f','S16_LE','-r',str(SAMPLE_RATE),'-c','1','-t','raw']
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except FileNotFoundError:
        print('[bridge] Thiếu arecord (cài alsa-utils).', file=sys.stderr)
        return
    try:
        while True:
            data = proc.stdout.read(8000)
            if not data:
                break
            enqueue_chunk(data)
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f'[bridge] Lỗi đọc arecord: {e}', file=sys.stderr)

if __name__ == '__main__':
    main()
