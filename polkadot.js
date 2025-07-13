const { ApiPromise, WsProvider } = require("@polkadot/api");
const { EventEmitter } = require("events");
require("dotenv").config();

class PolkadotService extends EventEmitter {
  constructor() {
    super();
    this.api = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      const provider = new WsProvider(process.env.WSS_SUBSTRATE_RPC_URL);
      this.api = await ApiPromise.create({ provider });
      this.isConnected = true;

      console.log("Connected to Polkadot network");
      console.log("Genesis Hash:", this.api.genesisHash.toHex());

      this.emit("connection-status", {
        connected: true,
        genesisHash: this.api.genesisHash.toHex(),
      });

      return true;
    } catch (error) {
      console.error("Failed to connect to Polkadot:", error);
      this.isConnected = false;

      this.emit("connection-status", {
        connected: false,
        error: error.message,
      });

      return false;
    }
  }

  async startMonitoring(address = process.env.MONITORED_ADDRESS) {
    if (!this.api || !this.isConnected) {
      throw new Error("Polkadot API not initialized");
    }

    // Monitor account balance changes
    await this.api.query.system.account(address, (accountInfo) => {
      const balanceData = {
        address: address,
        free: this.formatDOTBalance(accountInfo.data.free),
        reserved: this.formatDOTBalance(accountInfo.data.reserved),
        nonce: accountInfo.nonce.toString(),
        timestamp: new Date().toISOString(),
      };

      console.log(`Account ${address} updated:`, balanceData);
      this.emit("balance-update", balanceData);
    });

    // Monitor transfer events
    await this.api.query.system.events((events) => {
      // Get current block hash for transaction links
      this.api.rpc.chain.getBlockHash().then((blockHash) => {
        events
          .filter((record) => {
            const { event } = record;
            // Only look at balance transfers (DOT native)
            if (event.section !== "balances" || event.method !== "Transfer") {
              return false;
            }

            // Check if our address is involved
            const [from, to] = event.data;
            return from.toString() === address || to.toString() === address;
          })
          .forEach((record) => {
            const { event, phase } = record;
            const [from, to, amount] = event.data;
            const fromStr = from.toString();
            const toStr = to.toString();

            const transferData = {
              from: fromStr,
              to: toStr,
              amount: this.formatDOTBalance(amount),
              currency: "DOT",
              phase: phase.toString(),
              direction: fromStr === address ? "Outgoing" : "Incoming",
              timestamp: new Date().toISOString(),
              blockHash: blockHash.toHex(),
            };

            console.log("DOT Transfer Detected:", transferData);
            this.emit("transfer-event", transferData);
          });
      });
    });
  }

  formatDOTBalance(balance) {
    // DOT has 10 decimal places
    const dotBalance = balance.toBigInt() / BigInt(10 ** 10);
    const remainder = balance.toBigInt() % BigInt(10 ** 10);
    const decimal = Number(remainder) / 10 ** 10;
    return (Number(dotBalance) + decimal).toFixed(4);
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      genesisHash: this.api ? this.api.genesisHash.toHex() : null,
    };
  }

  disconnect() {
    if (this.api) {
      this.api.disconnect();
      this.isConnected = false;
      this.api = null;
    }
  }
}

module.exports = PolkadotService;
