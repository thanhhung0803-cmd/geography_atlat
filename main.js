const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('node:path');

const FIRST_POSITION = 1;
const LAST_POSITION = 7;
let mainWindow;

function openPosition(position) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('positionUpdate', position, true);
  }
}

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

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  globalShortcut.register('F11', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  for (let position = FIRST_POSITION; position <= LAST_POSITION; position++) {
    globalShortcut.register(String(position), () => openPosition(position));
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => globalShortcut.unregisterAll());
