/**
 * Astreus EVM Plugin
 * A plugin for the Astreus AI framework that provides EVM blockchain integration
 */

import { EVMPlugin } from './plugin';
import { EVMClient } from './client';
import { 
  EVMConfig, 
  NetworkConfig, 
  TransactionRequest, 
  TransactionResponse,
  AccountBalance,
  GasEstimation,
  BlockInfo,
  EventLog,
  ENSInfo,
  WalletInfo,
  ContractInterface,
  ContractCallResult,
  ContractTransactionResult,
  TokenInfo,
  COMMON_NETWORKS
} from './types';

// Export all components
export { 
  EVMPlugin, 
  EVMClient, 
  EVMConfig, 
  NetworkConfig,
  TransactionRequest,
  TransactionResponse,
  AccountBalance,
  GasEstimation,
  BlockInfo,
  EventLog,
  ENSInfo,
  WalletInfo,
  ContractInterface,
  ContractCallResult,
  ContractTransactionResult,
  TokenInfo,
  COMMON_NETWORKS
};

// Default export
export default EVMPlugin;