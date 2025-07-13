const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { ApiPromise, WsProvider } = require("@polkadot/api");

let mainWindow;
let api;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
  
  // Initialize Polkadot API connection
  initializePolkadotAPI();
}

async function initializePolkadotAPI() {
  try {
    const provider = new WsProvider("wss://rpc.polkadot.io");
    api = await ApiPromise.create({ provider });
    
    console.log('Connected to Polkadot network');
    console.log('Genesis Hash:', api.genesisHash.toHex());
    
    // Send connection status to renderer
    mainWindow.webContents.send('connection-status', {
      connected: true,
      genesisHash: api.genesisHash.toHex()
    });
    
    // Start monitoring
    startMonitoring();
    
  } catch (error) {
    console.error('Failed to connect to Polkadot:', error);
    mainWindow.webContents.send('connection-status', {
      connected: false,
      error: error.message
    });
  }
}

async function startMonitoring() {
  const BINANCE_ADDRESS = "1qnJN7FViy3HZaxZK9tGAA71zxHSBeUweirKqCaox4t8GT7";
  
  // Helper function to convert balance to DOT decimal
  function formatDOTBalance(balance) {
    // DOT has 10 decimal places
    const dotBalance = balance.toBigInt() / BigInt(10 ** 10);
    const remainder = balance.toBigInt() % BigInt(10 ** 10);
    const decimal = Number(remainder) / (10 ** 10);
    return (Number(dotBalance) + decimal).toFixed(4);
  }
  
  // Monitor account balance changes
  await api.query.system.account(BINANCE_ADDRESS, (accountInfo) => {
    const balanceData = {
      address: BINANCE_ADDRESS,
      free: formatDOTBalance(accountInfo.data.free),
      reserved: formatDOTBalance(accountInfo.data.reserved),
      nonce: accountInfo.nonce.toString(),
      timestamp: new Date().toISOString()
    };
    
    console.log(`Account ${BINANCE_ADDRESS} updated:`, balanceData);
    
    // Send balance update to renderer
    mainWindow.webContents.send('balance-update', balanceData);
  });
  
  // Monitor transfer events
  await api.query.system.events((events) => {
    // Get current block hash for transaction links
    api.rpc.chain.getBlockHash().then((blockHash) => {
      events
        .filter((record) => {
          const { event } = record;
          // Only look at balance transfers (DOT native)
          if (event.section !== "balances" || event.method !== "Transfer") {
            return false;
          }
          
          // Check if our address is involved
          const [from, to] = event.data;
          return (
            from.toString() === BINANCE_ADDRESS ||
            to.toString() === BINANCE_ADDRESS
          );
        })
        .forEach((record) => {
          const { event, phase } = record;
          const [from, to, amount] = event.data;
          const fromStr = from.toString();
          const toStr = to.toString();
          
          const transferData = {
            from: fromStr,
            to: toStr,
            amount: formatDOTBalance(amount),
            currency: 'DOT',
            phase: phase.toString(),
            direction: fromStr === BINANCE_ADDRESS ? 'Outgoing' : 'Incoming',
            timestamp: new Date().toISOString(),
            blockHash: blockHash.toHex()
          };
          
          console.log('DOT Transfer Detected:', transferData);
          
          // Send transfer event to renderer
          mainWindow.webContents.send('transfer-event', transferData);
        });
    });
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle renderer requests
ipcMain.handle('get-connection-status', () => {
  return {
    connected: !!api,
    genesisHash: api ? api.genesisHash.toHex() : null
  };
});

// Handle opening external links
ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});