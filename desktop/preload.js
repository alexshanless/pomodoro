const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pompayDesktop', {
  minimize: () => ipcRenderer.send('widget:minimize'),
  close: () => ipcRenderer.send('widget:close'),
  togglePin: () => ipcRenderer.invoke('widget:togglePin')
});
