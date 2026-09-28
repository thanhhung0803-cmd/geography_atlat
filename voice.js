// voice.js - Voice recognition wrapper for Vietnamese city/province names.
// Preferred: Python bridge (voice_bridge.py) using vosk (pip) when Node vosk not installed.
// If Node module 'vosk' is available, we use it directly; otherwise fallback to Python.

const fs = require('node:fs');
const path = require('node:path');
let vosk = null; // optional
try { vosk = require('vosk'); } catch { vosk = null; }
const { spawn } = require('node:child_process');

const SAMPLE_RATE = 16000;

// Map normalized Nam O destination names -> position numbers (see CITY_DATA positions)
const NAME_TO_POSITION = {
  'lang ngu ong nam o': 1,
  'lang ca ong': 1,
  'lang ong': 1,
  'dinh lang nam o': 2,
  'dinh nam o': 2,
  'mieu ba huyen tran': 3,
  'dinh ba huyen tran': 3,
  'mieu ba lieu hanh': 3,
  'dinh co hon nam o': 4,
  'mieu am linh': 4,
  'gieng cham co nam o': 5,
  'gieng lang': 5,
  'gieng vuong': 5,
  'ghenh nam o': 6,
  'ran nam o': 6,
  'lang nghe nuoc mam nam o': 7,
  'nuoc mam nam o': 7,
  'lang nuoc mam nam o': 7,
  'goi ca nam o': 8,
  'goi ca': 8
};

function stripDiacritics(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'D')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .trim();
}

function findPositionFromText(text) {
  const norm = stripDiacritics(text);
  const tokens = norm.split(/[^a-z0-9]+/).filter(Boolean);
  const variants = new Set([norm]);
  for (let size = 2; size <= 4; size++) {
    for (let i = 0; i <= tokens.length - size; i++) {
      variants.add(tokens.slice(i, i + size).join(' '));
    }
  }
  for (const v of variants) {
    if (NAME_TO_POSITION[v]) return NAME_TO_POSITION[v];
  }
  return null;
}

function startVoice(onEvent) {
  if (!vosk) {
    // Fallback: python bridge
    const bridge = path.join(__dirname, 'voice_bridge.py');
    if (!fs.existsSync(bridge)) {
      console.error('[VOICE] No vosk (node) and missing voice_bridge.py');
      return { stop() {} };
    }
    const venvPython = process.platform === 'win32'
      ? path.join(__dirname, '.venv', 'Scripts', 'python.exe')
      : path.join(__dirname, '.venv', 'bin', 'python3');
    const pyCmd = fs.existsSync(venvPython)
      ? venvPython
      : (process.platform === 'win32' ? 'python' : 'python3');
    console.log('[VOICE] Starting Python bridge with:', pyCmd);
    const proc = spawn(pyCmd, [bridge], { stdio: ['pipe','pipe','pipe'] });
    console.log('[VOICE] Using Python bridge, PID:', proc.pid);
    let isPaused = false;
    let lastTriggerTs = 0;
    let lastPos = null;
    const DEBOUNCE_MS = 5000; // ignore repeats within 5s (increased from 2s)

    proc.stdout.on('data', d => {
      if (isPaused) return; // Skip processing when paused
      const lines = d.toString().split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        let isFinal = false;
        let txt = '';
        if (line.startsWith('START:')) {
          onEvent({ type: 'start', at: Number(line.slice(6).trim()) || Date.now() });
          continue;
        }
        if (line.startsWith('END:')) {
          onEvent({ type: 'end', at: Number(line.slice(4).trim()) || Date.now() });
          continue;
        }
        if (line.startsWith('FINAL:')) {
          isFinal = true;
          txt = line.slice(6).trim();
        } else if (line.startsWith('PARTIAL:')) {
          txt = line.slice(8).trim();
        } else {
          continue;
        }
        if (!txt) continue;
        console.debug('[VOICE]', isFinal ? 'FINAL raw:' : 'PARTIAL raw:', txt);
        const pos = findPositionFromText(txt);
        const now = Date.now();
        
        // Ignore if same position triggered within 10 seconds (prevent acoustic feedback loop)
        if (pos && pos === lastPos && now - lastTriggerTs < 10000) {
          console.debug('[VOICE] Ignoring repeated position', pos, 'within 10s (acoustic feedback prevention)');
          continue;
        }
        
        if (pos && (pos !== lastPos || now - lastTriggerTs > DEBOUNCE_MS)) {
          console.debug('[VOICE] Trigger position', pos, 'from text:', txt, isFinal ? '(final)' : '(partial)');
          lastPos = pos;
          lastTriggerTs = now;
          onEvent(pos);
        }
      }
    });
    proc.stderr.on('data', e => {
      const msg = e.toString().trim();
      if (msg) console.log('[VOICE][py]', msg);  // Đổi từ debug sang log để thấy rõ
    });
    proc.on('error', (err) => {
      console.error('[VOICE] Bridge process error:', err);
    });
    proc.on('exit', (code, signal) => {
      console.error('[VOICE] Bridge exited with code:', code, 'signal:', signal);
    });
    return {
      stop() { try { proc.kill('SIGINT'); } catch {} },
      pause() {
        isPaused = true;
        console.log('[VOICE] Paused (muted during audio playback)');
        // Send PAUSE command to Python bridge
        try {
          proc.stdin.write('PAUSE\n');
        } catch (e) {
          console.error('[VOICE] Failed to send PAUSE:', e.message);
        }
      },
      resume() {
        isPaused = false;
        console.log('[VOICE] Resumed listening');
        // Send RESUME command to Python bridge
        try {
          proc.stdin.write('RESUME\n');
        } catch (e) {
          console.error('[VOICE] Failed to send RESUME:', e.message);
        }
      }
    };
  }

  const modelPath = path.join(__dirname, 'models', 'vn');
  if (!fs.existsSync(modelPath)) {
    console.warn('[VOICE] Model not found at', modelPath, '→ falling back to python (if available)');
    vosk = null; // force fallback next call
    return startVoice(onEvent);
  }
  try {
    vosk.setLogLevel(-1);
    const model = new vosk.Model(modelPath);
    const recognizer = new vosk.Recognizer({ model, sampleRate: SAMPLE_RATE });
    console.log('[VOICE] Using Node vosk + arecord');
  const arecord = spawn('arecord', ['-f','S16_LE','-r',String(SAMPLE_RATE),'-c','1','-t','raw'], { stdio: ['ignore','pipe','pipe'] });
    let lastTriggerTs = 0;
    let lastPos = null;
    const DEBOUNCE_MS = 2000;
    arecord.stdout.on('data', data => {
      try {
        if (recognizer.acceptWaveform(data)) {
          const res = recognizer.result();
          const txt = res && res.text ? res.text.trim() : '';
          if (txt) {
            const pos = findPositionFromText(txt);
            const now = Date.now();
            if (pos && (pos !== lastPos || now - lastTriggerTs > DEBOUNCE_MS)) {
              lastPos = pos;
              lastTriggerTs = now;
              onEvent(pos);
            }
          }
        }
      } catch (e) { console.error('[VOICE] Error:', e.message); }
    });
    function stop() {
      try { arecord.kill('SIGINT'); } catch {}
      try { recognizer.free(); } catch {}
      try { model.free(); } catch {}
    }
    return { stop };
  } catch (e) {
    console.error('[VOICE] Node vosk failure, fallback to python:', e.message);
    vosk = null;
    return startVoice(onEvent);
  }
}

module.exports = { startVoice, findPositionFromText };
