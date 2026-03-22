const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getHints: (question) => ipcRenderer.invoke('get-hints', question),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
});
