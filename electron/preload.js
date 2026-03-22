const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getHints: (data) => ipcRenderer.invoke('get-hints', data),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
});
