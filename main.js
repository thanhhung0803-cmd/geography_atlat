const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const FIRST_POSITION = 1;
const LAST_POSITION = 7;
let mainWindow;
let gpioProcess = null;
let voiceController = null;
let rendererReady = false;
let pendingPosition = null;
let narrationPlaying = false;
let activePosition = null;

function readConfig() {
  const defaults = {
    disableGPU: false,
    useGPIO: false,
    useVoice: false,
    useKeyboard: false
  };
  const piConfig = path.join(__dirname, 'config.pi.json');
  const configFile = process.platform === 'linux' && fs.existsSync(piConfig)
    ? piConfig
    : path.join(__dirname, 'config.json');
  try {
    const value = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    console.log('[CONFIG] Using', path.basename(configFile), value);
    return { ...defaults, ...value };
  } catch (error) {
    console.warn('[CONFIG] Cannot read configuration, using defaults:', error.message);
    return defaults;
  }
}

const config = readConfig();
if (config.disableGPU) app.disableHardwareAcceleration();

function openPosition(position, source = 'UNKNOWN') {
  console.log(`[POSITION] ${source} -> ${position}`);
  activePosition = position;
  if (voiceController && typeof voiceController.setActivePosition === 'function') {
    voiceController.setActivePosition(position);
  }
  if (mainWindow && !mainWindow.isDestroyed() && rendererReady) {
    mainWindow.webContents.send('positionUpdate', position, true);
    pendingPosition = null;
  } else {
    pendingPosition = position;
  }
}

function startGPIO() {
  if (!config.useGPIO) {
    console.log('[GPIO] Disabled by configuration');
    return;
  }
  if (process.platform !== 'linux') {
    console.log('[GPIO] Skipped: GPIO bridge only runs on Linux/Raspberry Pi');
    return;
  }

  const bridge = path.join(__dirname, 'gpio_bridge.py');
  console.log('[GPIO] Starting bridge:', bridge);
  gpioProcess = spawn('python3', [bridge], { stdio: ['ignore', 'pipe', 'pipe'] });
  let pending = '';

  gpioProcess.stdout.on('data', (chunk) => {
    pending += chunk.toString();
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || '';
    for (const line of lines) {
      const match = /^POSITION:([1-7])$/.exec(line.trim());
      if (match) openPosition(Number(match[1]), 'GPIO');
    }
  });
  gpioProcess.stderr.on('data', (chunk) => {
    const message = chunk.toString().trim();
    if (message) console.log('[GPIO]', message);
  });
  gpioProcess.on('error', (error) => console.error('[GPIO] Cannot start bridge:', error.message));
  gpioProcess.on('exit', (code, signal) => {
    console.log('[GPIO] Bridge stopped:', { code, signal });
    gpioProcess = null;
  });
}

function startVoiceRecognition() {
  if (!config.useVoice) return;
  try {
    const { startVoice } = require('./voice');
    voiceController = startVoice((event) => {
      if (Number.isInteger(event) && event >= FIRST_POSITION && event <= LAST_POSITION) {
        openPosition(event, 'VOICE');
      }
    });
    if (typeof voiceController.setActivePosition === 'function') {
      voiceController.setActivePosition(activePosition);
    }
    if (typeof voiceController.setNarrationPlaying === 'function') {
      voiceController.setNarrationPlaying(narrationPlaying);
    }
  } catch (error) {
    console.error('[VOICE] Cannot start:', error.message);
  }
}

ipcMain.on('narration-state', (_event, isPlaying) => {
  narrationPlaying = Boolean(isPlaying);
  if (!voiceController) return;
  if (typeof voiceController.setNarrationPlaying === 'function') {
    voiceController.setNarrationPlaying(narrationPlaying);
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    autoHideMenuBar: true,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  rendererReady = false;
  mainWindow.webContents.once('did-finish-load', () => {
    rendererReady = true;
    if (pendingPosition !== null) openPosition(pendingPosition, 'PENDING');
  });
  mainWindow.on('closed', () => {
    rendererReady = false;
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  startGPIO();
  startVoiceRecognition();

  globalShortcut.register('F11', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  if (config.useKeyboard) {
    for (let position = FIRST_POSITION; position <= LAST_POSITION; position++) {
      globalShortcut.register(String(position), () => openPosition(position, 'KEYBOARD'));
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (gpioProcess) gpioProcess.kill('SIGINT');
  if (voiceController && typeof voiceController.stop === 'function') voiceController.stop();
});
