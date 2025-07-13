const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {

  // Get environment variables
  getEnvVars: () => ipcRenderer.invoke('get-env-vars'),
  
  // Listeners for data from main process
  onConnectionStatus: (callback) => ipcRenderer.on('connection-status', callback),
  onBalanceUpdate: (callback) => ipcRenderer.on('balance-update', callback),
  onTransferEvent: (callback) => ipcRenderer.on('transfer-event', callback),
  
  // Method to get initial connection status
  getConnectionStatus: () => ipcRenderer.invoke('get-connection-status'),
  
  // Method to open external links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});