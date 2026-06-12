const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openMainWindow: () => ipcRenderer.send('open-main-window'),
  hideToFloat: () => ipcRenderer.send('hide-to-float'),
  quitApp: () => ipcRenderer.send('quit-app'),
  floatMove: (delta) => ipcRenderer.send('float-move', delta),
  floatSnap: () => ipcRenderer.send('float-snap'),
  floatResize: (expanded) => ipcRenderer.send('float-resize', expanded),
  onDataUpdated: (callback) => {
    ipcRenderer.on('refresh-data', callback);
  },
  notifyDataUpdated: () => ipcRenderer.send('data-updated'),
});
