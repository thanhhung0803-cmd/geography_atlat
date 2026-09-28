// Offline Vietnamese keyword recognition for Raspberry Pi.
// The Python bridge owns Vosk + ALSA; this module maps recognized text to the
// same positions used by GPIO and forwards pause/resume commands.

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const PHRASES = [
  { position: 1, names: ['lang ca ong', 'lang ngu ong', 'lang ngu ong nam o'] },
  { position: 2, names: ['dinh lang', 'dinh lang nam o'] },
  { position: 3, names: ['mieu ba huyen tran', 'huyen tran'] },
  { position: 4, names: ['dinh am hon', 'dinh co hon', 'dinh co hon nam o', 'mieu am linh'] },
  { position: 5, names: ['gieng vuong', 'gieng cham', 'gieng cham co nam o', 'gieng lang'] },
  { position: 6, names: ['ghenh nam o', 'ran nam o'] },
  { position: 7, names: ['nuoc mam nam o', 'nuoc mam', 'lang nghe nuoc mam nam o'] }
];

const NAME_TO_POSITION = PHRASES
  .flatMap(({ position, names }) => names.map((name) => ({ name, position })))
  .sort((a, b) => b.name.length - a.name.length);

function stripDiacritics(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0110/g, 'D')
    .replace(/\u0111/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findPositionFromText(text) {
  const normalized = ` ${stripDiacritics(text)} `;
  const match = NAME_TO_POSITION.find(({ name }) => normalized.includes(` ${name} `));
  return match ? match.position : null;
}

function startVoice(onPosition) {
  const bridge = path.join(__dirname, 'voice_bridge.py');
  if (!fs.existsSync(bridge)) {
    console.error('[VOICE] Missing voice_bridge.py');
    return { stop() {}, pause() {}, resume() {} };
  }

  const venvPython = process.platform === 'win32'
    ? path.join(__dirname, '.venv', 'Scripts', 'python.exe')
    : path.join(__dirname, '.venv', 'bin', 'python3');
  const python = fs.existsSync(venvPython)
    ? venvPython
    : (process.platform === 'win32' ? 'python' : 'python3');
  const proc = spawn(python, [bridge], { stdio: ['pipe', 'pipe', 'pipe'] });
  console.log('[VOICE] Python bridge started, PID:', proc.pid);

  let stdoutBuffer = '';
  let paused = false;
  let lastPosition = null;
  let lastTriggerAt = 0;
  const SAME_POSITION_COOLDOWN_MS = 3000;

  proc.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk.toString('utf8');
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() || '';

    for (const line of lines) {
      if (paused || !line.startsWith('FINAL:')) continue;
      const recognizedText = line.slice('FINAL:'.length).trim();
      const position = findPositionFromText(recognizedText);
      if (!position) {
        console.log('[VOICE] No keyword in:', recognizedText);
        continue;
      }

      const now = Date.now();
      if (position === lastPosition && now - lastTriggerAt < SAME_POSITION_COOLDOWN_MS) continue;
      lastPosition = position;
      lastTriggerAt = now;
      console.log(`[VOICE] "${recognizedText}" -> position ${position}`);
      onPosition(position);
    }
  });

  proc.stderr.on('data', (chunk) => {
    const message = chunk.toString('utf8').trim();
    if (message) console.log('[VOICE][py]', message);
  });
  proc.on('error', (error) => console.error('[VOICE] Cannot run Python bridge:', error.message));
  proc.on('exit', (code, signal) => console.log('[VOICE] Bridge stopped:', { code, signal }));

  function command(value) {
    if (!proc.killed && proc.stdin.writable) proc.stdin.write(`${value}\n`);
  }

  return {
    stop() {
      if (!proc.killed) proc.kill('SIGINT');
    },
    pause() {
      if (paused) return;
      paused = true;
      command('PAUSE');
      console.log('[VOICE] Paused while narration is playing');
    },
    resume() {
      if (!paused) return;
      paused = false;
      command('RESUME');
      console.log('[VOICE] Listening');
    }
  };
}

module.exports = { startVoice, findPositionFromText };
