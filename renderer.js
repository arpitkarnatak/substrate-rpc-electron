let transferCount = 0;
let transfers = [];

// DOM elements
const connectionStatus = document.getElementById('connection-status');
const genesisHash = document.getElementById('genesis-hash');
const freeBalance = document.getElementById('free-balance');
const reservedBalance = document.getElementById('reserved-balance');
const nonce = document.getElementById('nonce');
const balanceUpdated = document.getElementById('balance-updated');
const transferCountElement = document.getElementById('transfer-count');
const transfersTableBody = document.getElementById('transfers-tbody');

// Initialize the app
async function initialize() {
    try {
        // Get initial connection status
        const status = await window.electronAPI.getConnectionStatus();
        updateConnectionStatus(status);
        
        // Set up event listeners
        setupEventListeners();
        
        // Set up main address link click handler
        setupMainAddressLink();
        
    } catch (error) {
        console.error('Failed to initialize:', error);
        updateConnectionStatus({ connected: false, error: error.message });
    }
}

function setupMainAddressLink() {
    const mainAddressLink = document.getElementById('main-address-link');
    if (mainAddressLink) {
        mainAddressLink.addEventListener('click', (e) => {
            e.preventDefault();
            const url = mainAddressLink.getAttribute('data-url');
            window.electronAPI.openExternal(url);
        });
    }
}

function setupEventListeners() {
    // Connection status updates
    window.electronAPI.onConnectionStatus((event, status) => {
        updateConnectionStatus(status);
    });
    
    // Balance updates
    window.electronAPI.onBalanceUpdate((event, balanceData) => {
        updateBalance(balanceData);
    });
    
    // Transfer events
    window.electronAPI.onTransferEvent((event, transferData) => {
        addTransferToTable(transferData);
    });
}

function updateConnectionStatus(status) {
    const indicator = connectionStatus.querySelector('.status-indicator');
    
    if (status.connected) {
        indicator.className = 'status-indicator status-connected';
        connectionStatus.innerHTML = `
            <span class="status-indicator status-connected"></span>
            Connected to Polkadot network
        `;
        
        if (status.genesisHash) {
            genesisHash.innerHTML = `Genesis Hash: <code>${status.genesisHash}</code>`;
        }
    } else {
        indicator.className = 'status-indicator status-disconnected';
        connectionStatus.innerHTML = `
            <span class="status-indicator status-disconnected"></span>
            Disconnected from Polkadot network
        `;
        
        if (status.error) {
            genesisHash.innerHTML = `<span style="color: #f44336;">Error: ${status.error}</span>`;
        }
    }
}

function updateBalance(balanceData) {
    freeBalance.textContent = balanceData.free;
    reservedBalance.textContent = balanceData.reserved;
    nonce.textContent = balanceData.nonce;
    
    const timestamp = new Date(balanceData.timestamp).toLocaleString();
    balanceUpdated.textContent = `Last updated: ${timestamp}`;
    
    // Add visual feedback for balance update
    const balanceSection = document.querySelector('.balance-section');
    balanceSection.style.backgroundColor = '#e8f5e8';
    setTimeout(() => {
        balanceSection.style.backgroundColor = 'white';
    }, 1000);
}

function addTransferToTable(transferData) {
    // Remove "no transfers" message if it exists
    const noTransfersRow = transfersTableBody.querySelector('.no-transfers');
    if (noTransfersRow) {
        noTransfersRow.parentElement.remove();
    }
    
    transferCount++;
    transfers.unshift(transferData); // Add to beginning for newest first
    
    // Update transfer count
    transferCountElement.textContent = transferCount;
    
    // Create Polkadot scan links (without href, using click handlers)
    const fromLink = `<a data-url="https://polkadot.subscan.io/account/${transferData.from}" title="${transferData.from}">${shortenAddress(transferData.from)}</a>`;
    const toLink = `<a data-url="https://polkadot.subscan.io/account/${transferData.to}" title="${transferData.to}">${shortenAddress(transferData.to)}</a>`;
    const blockLink = `<a data-url="https://polkadot.subscan.io/block/${transferData.blockHash}" class="transaction-link" title="View block ${transferData.blockHash}">Block</a>`;
    
    // Create new row
    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="direction-${transferData.direction.toLowerCase()}">${transferData.direction}</td>
        <td class="address">${fromLink}</td>
        <td class="address">${toLink}</td>
        <td class="amount">${transferData.amount} DOT</td>
        <td>${transferData.currency}</td>
        <td>${transferData.phase}</td>
        <td>${blockLink}</td>
        <td class="timestamp">${formatTimestamp(transferData.timestamp)}</td>
    `;
    
    // Add click handlers for external links
    row.querySelectorAll('a[data-url]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const url = link.getAttribute('data-url');
            window.electronAPI.openExternal(url);
        });
    });
    
    // Add to table (insert at beginning for newest first)
    transfersTableBody.insertBefore(row, transfersTableBody.firstChild);
    
    // Add visual feedback for new transfer
    row.style.backgroundColor = '#fff3cd';
    setTimeout(() => {
        row.style.backgroundColor = 'white';
    }, 2000);
    
    // Limit table to last 100 transfers to prevent memory issues
    if (transfers.length > 100) {
        transfers = transfers.slice(0, 100);
        const rows = transfersTableBody.querySelectorAll('tr');
        if (rows.length > 100) {
            rows[rows.length - 1].remove();
        }
    }
}

function shortenAddress(address) {
    if (address.length <= 20) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initialize);

// Cleanup on window close
window.addEventListener('beforeunload', () => {
    window.electronAPI.removeAllListeners('connection-status');
    window.electronAPI.removeAllListeners('balance-update');
    window.electronAPI.removeAllListeners('transfer-event');
});