const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const PolkadotService = require('./polkadot');
require('dotenv').config();

let mainWindow;
let polkadotService;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
  // Initialize Polkadot service
  initializePolkadotService();
}

async function initializePolkadotService() {
  polkadotService = new PolkadotService();
  
  // Listen to Polkadot service events
  polkadotService.on('connection-status', (status) => {
    mainWindow.webContents.send('connection-status', status);
  });
  
  polkadotService.on('balance-update', (balanceData) => {
    mainWindow.webContents.send('balance-update', balanceData);
  });
  
  polkadotService.on('transfer-event', (transferData) => {
    mainWindow.webContents.send('transfer-event', transferData);
  });
  
  // Initialize connection
  const connected = await polkadotService.initialize();
  
  if (connected) {
    // Start monitoring with default Binance address
    await polkadotService.startMonitoring();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Clean up Polkadot connection
  if (polkadotService) {
    polkadotService.disconnect();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle getting environment variables
ipcMain.handle('get-env-vars', () => {
  return {
    MONITOR_ADDRESS: process.env.MONITORED_ADDRESS,
    POLKADOT_RPC_ENDPOINT: process.env.WSS_SUBSTRATE_RPC_URL
  };
});

// Handle renderer requests
ipcMain.handle('get-connection-status', () => {
  return polkadotService ? polkadotService.getConnectionStatus() : { connected: false, genesisHash: null };
});

// Handle opening external links
ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});