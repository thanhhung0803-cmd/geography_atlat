const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  onPositionUpdate: (callback) => {
    ipcRenderer.on('positionUpdate', (_event, position, immediate) => callback(position, immediate));
  }
});



