// Preload script for Electron
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // File operations
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  
  // API health check
  checkApi: (apiUrl) => ipcRenderer.invoke('check-api', apiUrl),
}); 