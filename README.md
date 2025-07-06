![EVM Plugin](src/assets/evm-plugin.webp)

# Astreus EVM Plugin

An EVM integration plugin for the Astreus AI agent framework, enabling agents to interact with Ethereum and EVM-compatible blockchains.

## Features

- **Multi-Network Support**: Connect to Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, BSC, and more
- **Comprehensive Web3 Integration**: Send transactions, interact with smart contracts, manage wallets, and more
- **Smart Contract Interaction**: Deploy contracts, call methods, and interact with DeFi protocols
- **Wallet Management**: Create, import, and manage multiple cryptocurrency wallets
- **ENS Resolution**: Resolve Ethereum Name Service domains to addresses
- **Enhanced Logging**: Detailed logging of blockchain operations for improved debugging
- **Integration with Astreus Logger**: Consistent logging patterns with the core framework

## Installation

```bash
npm install @astreus-ai/evm-plugin
```

## Configuration

Create a `.env` file with your EVM configuration:

```env
# Default network (mainnet, sepolia, polygon, arbitrum, etc.)
EVM_DEFAULT_NETWORK=mainnet

# Private keys (comma-separated for multiple wallets)
EVM_PRIVATE_KEYS=0x1234567890abcdef...,0xabcdef1234567890...

# Or use a mnemonic phrase for HD wallet
EVM_MNEMONIC=word1 word2 word3 ... word12

# HD wallet configuration (optional)
EVM_HD_PATH=m/44'/60'/0'/0
EVM_ACCOUNT_INDEX=0

# Logging options
LOG_LEVEL=info  # Options: error, warn, info, debug
```

## Usage

### Basic Usage

```typescript
import { createAgent, createProvider, createMemory, createDatabase, PluginManager } from '@astreus-ai/astreus';
import EVMPlugin from '@astreus-ai/evm-plugin';

// Initialize database and memory
const db = await createDatabase();
const memory = await createMemory({ database: db });
const provider = createProvider({ type: 'openai', model: 'gpt-4o-mini' });

// Create an EVM plugin instance
const evmPlugin = new EVMPlugin();

// Initialize the plugin
await evmPlugin.init();

// Create a plugin manager and add the EVM plugin
const pluginManager = new PluginManager({
  name: 'web3-plugins',
  tools: evmPlugin.getTools()
});

// Create an agent with the plugin manager
const agent = await createAgent({
  name: 'Web3 Agent',
  description: 'An agent that can interact with blockchains',
  provider: provider,
  memory: memory,
  database: db,
  plugins: [pluginManager]
});

// Now the agent can use Web3 functionality
const response = await agent.chat(`Send 0.1 ETH to vitalik.eth`);
```

### Custom Configuration

```typescript
import { createAgent, createProvider, createMemory, createDatabase, PluginManager } from '@astreus-ai/astreus';
import EVMPlugin from '@astreus-ai/evm-plugin';

// Initialize database and memory
const db = await createDatabase();
const memory = await createMemory({ database: db });
const provider = createProvider({ type: 'openai', model: 'gpt-4o-mini' });

// Create a plugin with custom configuration
const evmPlugin = new EVMPlugin({
  defaultNetwork: 'sepolia',
  privateKeys: ['0x...'],
  mnemonic: 'your twelve word mnemonic phrase',
  networks: {
    localhost: {
      name: 'Local Hardhat',
      chainId: 31337,
      rpcUrl: 'http://127.0.0.1:8545',
      nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18
      }
    }
  }
});

// Initialize the plugin
await evmPlugin.init();

// Create a plugin manager and add the EVM plugin
const pluginManager = new PluginManager({
  name: 'web3-plugins',
  tools: evmPlugin.getTools()
});

// Create an agent with the plugin manager
const agent = await createAgent({
  name: 'Web3 Agent',
  description: 'An agent that can interact with blockchains',
  provider: provider,
  memory: memory,
  database: db,
  plugins: [pluginManager]
});
```

## Available Tools

The EVM plugin provides the following tools to Astreus agents:

- `evm_get_balance`: Get the balance of an Ethereum address
- `evm_send_transaction`: Send native currency (ETH, MATIC, etc.) to an address
- `evm_estimate_gas`: Estimate gas for a transaction
- `evm_get_block`: Get block information
- `evm_get_transaction`: Get transaction details by hash
- `evm_get_logs`: Get event logs
- `evm_resolve_ens`: Resolve an ENS name to an address
- `evm_create_wallet`: Create a new Ethereum wallet
- `evm_import_wallet`: Import a wallet from private key
- `evm_list_wallets`: List all wallet addresses
- `evm_switch_network`: Switch to a different network
- `evm_get_network`: Get current network information
- `evm_call_contract`: Call a smart contract method (read-only)
- `evm_send_contract_transaction`: Send a transaction to a smart contract
- `evm_deploy_contract`: Deploy a new smart contract
- `evm_get_gas_prices`: Get current gas prices
- `evm_sign_message`: Sign a message with a wallet
- `evm_verify_message`: Verify a signed message

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📬 Contact

Astreus Team - [https://astreus.org](https://astreus.org)

Project Link: [https://github.com/astreus-ai/astreus-evm-plugin](https://github.com/astreus-ai/astreus-evm-plugin)