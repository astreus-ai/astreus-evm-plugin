/**
 * Type definitions for the EVM plugin
 */

import { ethers } from 'ethers';

// EVM Plugin Configuration
export interface EVMConfig {
  // Network configurations
  networks?: {
    [key: string]: NetworkConfig;
  };
  
  // Default network to use
  defaultNetwork?: string;
  
  // Private keys or mnemonics for wallets
  privateKeys?: string[];
  mnemonic?: string;
  
  // HD wallet configuration
  hdPath?: string;
  accountIndex?: number;
  
  // Provider configurations
  providerTimeout?: number;
  
  // Gas settings
  defaultGasLimit?: bigint;
  defaultGasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

// Network Configuration
export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer?: string;
}

// Transaction Request
export interface TransactionRequest {
  to: string;
  from?: string;
  value?: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
  chainId?: number;
}

// Transaction Response
export interface TransactionResponse {
  hash: string;
  from: string;
  to: string;
  value: string;
  data: string;
  gasLimit: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce: number;
  chainId: number;
  blockNumber?: number;
  blockHash?: string;
  timestamp?: number;
  status?: number;
}

// Contract Interface
export interface ContractInterface {
  address: string;
  abi: any[];
}

// Token Information
export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: string;
}

// Account Balance
export interface AccountBalance {
  address: string;
  balance: string;
  formattedBalance: string;
  nonce: number;
}

// Gas Estimation
export interface GasEstimation {
  gasLimit: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  estimatedCost: string;
}

// Block Information
export interface BlockInfo {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: number;
  gasLimit: string;
  gasUsed: string;
  baseFeePerGas?: string;
  transactions: string[];
}

// Event Log
export interface EventLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  logIndex: number;
  removed: boolean;
  event?: string;
  args?: any[];
}

// ENS Information
export interface ENSInfo {
  name?: string;
  address?: string;
  resolver?: string;
  avatar?: string;
}

// Wallet Information
export interface WalletInfo {
  address: string;
  privateKey?: string;
  publicKey: string;
  mnemonic?: string;
  path?: string;
}

// Contract Call Result
export interface ContractCallResult {
  result: any;
  decoded?: any;
  error?: string;
}

// Contract Transaction Result
export interface ContractTransactionResult {
  hash: string;
  from: string;
  to: string;
  value: string;
  data: string;
  receipt?: ethers.TransactionReceipt;
  error?: string;
}

// Common Networks
export const COMMON_NETWORKS: { [key: string]: NetworkConfig } = {
  mainnet: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorer: 'https://etherscan.io'
  },
  sepolia: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpcUrl: 'https://sepolia.infura.io/v3/',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorer: 'https://sepolia.etherscan.io'
  },
  polygon: {
    name: 'Polygon Mainnet',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    blockExplorer: 'https://polygonscan.com'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorer: 'https://optimistic.etherscan.io'
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorer: 'https://basescan.org'
  },
  avalanche: {
    name: 'Avalanche C-Chain',
    chainId: 43114,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18
    },
    blockExplorer: 'https://snowtrace.io'
  },
  bsc: {
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    blockExplorer: 'https://bscscan.com'
  }
};