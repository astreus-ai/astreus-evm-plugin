import { EVMClient } from './client';
import { 
  EVMConfig, 
  TransactionRequest, 
  TransactionResponse,
  AccountBalance,
  GasEstimation,
  BlockInfo,
  EventLog,
  ENSInfo,
  WalletInfo,
  ContractCallResult,
  ContractTransactionResult,
  COMMON_NETWORKS
} from './types';
import dotenv from 'dotenv';
import { ToolParameterSchema, Plugin, PluginConfig, PluginInstance, logger } from '@astreus-ai/astreus';

// Load environment variables
dotenv.config();

// OpenAI function definition interface
interface OpenAIFunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * EVM Plugin for Astreus
 * This plugin provides EVM blockchain functionality for Astreus agents
 */
export class EVMPlugin implements PluginInstance {
  public name = 'evm';
  public description = 'EVM blockchain integration for Astreus agents';
  private client: EVMClient | null = null;
  private evmConfig: EVMConfig;
  private tools: Map<string, Plugin> = new Map();
  private functionDefinitions: Map<string, OpenAIFunctionDefinition> = new Map();
  public config: PluginConfig;

  constructor(config?: EVMConfig) {
    this.evmConfig = config || {
      networks: {},
      defaultNetwork: process.env.EVM_DEFAULT_NETWORK || 'mainnet',
      privateKeys: process.env.EVM_PRIVATE_KEYS?.split(',').filter(Boolean),
      mnemonic: process.env.EVM_MNEMONIC,
      hdPath: process.env.EVM_HD_PATH,
      accountIndex: process.env.EVM_ACCOUNT_INDEX ? parseInt(process.env.EVM_ACCOUNT_INDEX) : undefined,
    };

    // Initialize plugin config
    this.config = {
      name: 'evm',
      description: 'EVM blockchain integration for Astreus agents',
      version: '0.1.0',
      tools: []
    };

    // Initialize tools
    this.initializeTools();
  }

  /**
   * Initialize the EVM client
   */
  async init(): Promise<void> {
    try {
      logger.info("EVM Plugin", "Initialization", 'Initializing EVM plugin...');
      
      // Initialize client
      this.client = new EVMClient(this.evmConfig);
      
      // Test connection
      const network = await this.client.getNetwork();
      if (network) {
        logger.info("EVM Plugin", "Initialization", `Connected to ${network.name} (Chain ID: ${network.chainId})`);
      }
      
      // Log wallet addresses
      const addresses = this.client.getWalletAddresses();
      if (addresses.length > 0) {
        logger.info("EVM Plugin", "Initialization", `Initialized ${addresses.length} wallet(s)`);
        addresses.forEach((addr, index) => {
          logger.debug("EVM Plugin", "Wallet", `Wallet ${index}: ${addr}`);
        });
      } else {
        logger.warn("EVM Plugin", "Initialization", 'No wallets initialized. Some functions may be limited.');
      }
      
      // Update tools with initialized client
      this.initializeTools();
      
      // Log tools summary
      this.logToolsSummary();
      
      logger.success("EVM Plugin", "Initialization", 'EVM plugin initialized successfully');
    } catch (error) {
      logger.error("EVM Plugin", "Initialization", `Failed to initialize EVM plugin: ${error}`);
      throw error;
    }
  }

  /**
   * Log a summary of the tools initialized
   */
  private logToolsSummary(): void {
    const toolNames = Array.from(this.tools.keys());
    logger.info("EVM Plugin", "Tools", `Registered ${toolNames.length} tools: ${toolNames.join(', ')}`);
  }

  /**
   * Initialize tools for Astreus compatibility
   */
  private initializeTools(): void {
    // Get function definitions
    const functionDefs = this.getFunctionDefinitions();
    
    for (const funcDef of functionDefs) {
      // Store the original OpenAI function definition
      this.functionDefinitions.set(funcDef.name, funcDef);
      
      // Create Astreus Plugin format
      const plugin: Plugin = {
        name: funcDef.name,
        description: funcDef.description,
        parameters: this.convertOpenAISchemaToToolParameters(funcDef.parameters),
        execute: async (params: Record<string, any>) => {
          // Make sure client is initialized
          if (!this.client) await this.init();
          if (!this.client) throw new Error('EVM client not initialized');

          // Execute method based on the tool name
          const methodName = funcDef.name.replace('evm_', '');
          
          logger.debug("EVM Plugin", "Tool", `Running tool ${funcDef.name}`);
          
          let result;
          
          try {
            switch (methodName) {
              case 'get_balance': result = await this.getBalance(params); break;
              case 'send_transaction': result = await this.sendTransaction(params); break;
              case 'estimate_gas': result = await this.estimateGas(params); break;
              case 'get_block': result = await this.getBlock(params); break;
              case 'get_transaction': result = await this.getTransaction(params); break;
              case 'get_logs': result = await this.getLogs(params); break;
              case 'resolve_ens': result = await this.resolveENS(params); break;
              case 'create_wallet': result = await this.createWallet(); break;
              case 'import_wallet': result = await this.importWallet(params); break;
              case 'list_wallets': result = await this.listWallets(); break;
              case 'switch_network': result = await this.switchNetwork(params); break;
              case 'get_network': result = await this.getNetwork(); break;
              case 'call_contract': result = await this.callContract(params); break;
              case 'send_contract_transaction': result = await this.sendContractTransaction(params); break;
              case 'deploy_contract': result = await this.deployContract(params); break;
              case 'get_gas_prices': result = await this.getGasPrices(); break;
              case 'sign_message': result = await this.signMessage(params); break;
              case 'verify_message': result = await this.verifyMessage(params); break;
              default: throw new Error(`Unknown method: ${methodName}`);
            }
            
            logger.debug("EVM Plugin", "Tool", `Tool ${funcDef.name} completed execution`);
            return result;
          } catch (error) {
            logger.error("EVM Plugin", "Tool", `Error executing tool ${funcDef.name}: ${error}`);
            throw error;
          }
        }
      };

      // Add tool to the map
      this.tools.set(funcDef.name, plugin);
    }

    // Update plugin config tools
    this.config.tools = Array.from(this.tools.values());
  }

  /**
   * Get the function definitions for OpenAI compatibility
   */
  getFunctionDefinitions(): OpenAIFunctionDefinition[] {
    return [
      {
        name: 'evm_get_balance',
        description: 'Get the balance of an Ethereum address',
        parameters: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'The Ethereum address to check balance for',
              pattern: '^0x[a-fA-F0-9]{40}$'
            }
          },
          required: ['address']
        }
      },
      {
        name: 'evm_send_transaction',
        description: 'Send native currency (ETH, MATIC, etc.) to an address',
        parameters: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'The recipient address',
              pattern: '^0x[a-fA-F0-9]{40}$'
            },
            value: {
              type: 'string',
              description: 'The amount to send in ETH (e.g., "0.1")'
            },
            from: {
              type: 'string',
              description: 'The sender address (optional, uses default wallet if not specified)',
              pattern: '^0x[a-fA-F0-9]{40}$'
            },
            data: {
              type: 'string',
              description: 'Transaction data in hex (optional)'
            },
            gasLimit: {
              type: 'string',
              description: 'Gas limit for the transaction (optional)'
            }
          },
          required: ['to', 'value']
        }
      },
      {
        name: 'evm_estimate_gas',
        description: 'Estimate gas for a transaction',
        parameters: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'The recipient address',
              pattern: '^0x[a-fA-F0-9]{40}$'
            },
            value: {
              type: 'string',
              description: 'The amount to send in ETH (e.g., "0.1")'
            },
            from: {
              type: 'string',
              description: 'The sender address (optional)',
              pattern: '^0x[a-fA-F0-9]{40}$'
            },
            data: {
              type: 'string',
              description: 'Transaction data in hex (optional)'
            }
          },
          required: ['to']
        }
      },
      {
        name: 'evm_get_block',
        description: 'Get block information',
        parameters: {
          type: 'object',
          properties: {
            blockNumber: {
              type: 'integer',
              description: 'The block number (optional, defaults to latest)'
            }
          },
          required: []
        }
      },
      {
        name: 'evm_get_transaction',
        description: 'Get transaction details by hash',
        parameters: {
          type: 'object',
          properties: {
            hash: {
              type: 'string',
              description: 'The transaction hash',
              pattern: '^0x[a-fA-F0-9]{64}$'
            }
          },
          required: ['hash']
        }
      },
      {
        name: 'evm_get_logs',
        description: 'Get event logs',
        parameters: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'The contract address',
              pattern: '^0x[a-fA-F0-9]{40}$'
            },
            fromBlock: {
              type: 'integer',
              description: 'Starting block number'
            },
            toBlock: {
              type: 'integer',
              description: 'Ending block number'
            },
            topics: {
              type: 'array',
              description: 'Array of topic filters',
              items: {
                type: 'string'
              }
            }
          },
          required: []
        }
      },
      {
        name: 'evm_resolve_ens',
        description: 'Resolve an ENS name to an address',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The ENS name to resolve (e.g., "vitalik.eth")'
            }
          },
          required: ['name']
        }
      },
      {
        name: 'evm_create_wallet',
        description: 'Create a new Ethereum wallet',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'evm_import_wallet',
        description: 'Import a wallet from private key',
        parameters: {
          type: 'object',
          properties: {
            privateKey: {
              type: 'string',
              description: 'The private key to import',
              pattern: '^0x[a-fA-F0-9]{64}$'
            }
          },
          required: ['privateKey']
        }
      },
      {
        name: 'evm_list_wallets',
        description: 'List all wallet addresses',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'evm_switch_network',
        description: 'Switch to a different network',
        parameters: {
          type: 'object',
          properties: {
            network: {
              type: 'string',
              description: 'The network to switch to (e.g., "mainnet", "polygon", "arbitrum")',
              enum: Object.keys(COMMON_NETWORKS)
            }
          },
          required: ['network']
        }
      },
      {
        name: 'evm_get_network',
        description: 'Get current network information',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'evm_call_contract',
        description: 'Call a smart contract method (read-only)',
        parameters: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'The contract address',
              pattern: '^0x[a-fA-F0-9]{40}$'
            },
            abi: {
              type: 'array',
              description: 'The contract ABI'
            },
            method: {
              type: 'string',
              description: 'The method name to call'
            },
            params: {
              type: 'array',
              description: 'Method parameters',
              default: []
            }
          },
          required: ['address', 'abi', 'method']
        }
      },
      {
        name: 'evm_send_contract_transaction',
        description: 'Send a transaction to a smart contract',
        parameters: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'The contract address',
              pattern: '^0x[a-fA-F0-9]{40}$'
            },
            abi: {
              type: 'array',
              description: 'The contract ABI'
            },
            method: {
              type: 'string',
              description: 'The method name to call'
            },
            params: {
              type: 'array',
              description: 'Method parameters',
              default: []
            },
            value: {
              type: 'string',
              description: 'ETH value to send with transaction (optional)'
            },
            from: {
              type: 'string',
              description: 'The sender address (optional)',
              pattern: '^0x[a-fA-F0-9]{40}$'
            }
          },
          required: ['address', 'abi', 'method']
        }
      },
      {
        name: 'evm_deploy_contract',
        description: 'Deploy a new smart contract',
        parameters: {
          type: 'object',
          properties: {
            abi: {
              type: 'array',
              description: 'The contract ABI'
            },
            bytecode: {
              type: 'string',
              description: 'The contract bytecode'
            },
            params: {
              type: 'array',
              description: 'Constructor parameters',
              default: []
            },
            from: {
              type: 'string',
              description: 'The deployer address (optional)',
              pattern: '^0x[a-fA-F0-9]{40}$'
            }
          },
          required: ['abi', 'bytecode']
        }
      },
      {
        name: 'evm_get_gas_prices',
        description: 'Get current gas prices',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'evm_sign_message',
        description: 'Sign a message with a wallet',
        parameters: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'The message to sign'
            },
            address: {
              type: 'string',
              description: 'The address to sign with (optional)',
              pattern: '^0x[a-fA-F0-9]{40}$'
            }
          },
          required: ['message']
        }
      },
      {
        name: 'evm_verify_message',
        description: 'Verify a signed message',
        parameters: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'The original message'
            },
            signature: {
              type: 'string',
              description: 'The signature to verify'
            }
          },
          required: ['message', 'signature']
        }
      }
    ];
  }

  /**
   * Get all available tools
   */
  getTools(): Plugin[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): Plugin | undefined {
    return this.tools.get(name);
  }

  /**
   * Register a new tool
   */
  registerTool(tool: Plugin): void {
    this.tools.set(tool.name, tool);
    this.config.tools = Array.from(this.tools.values());
  }

  /**
   * Remove a tool by name
   */
  removeTool(name: string): boolean {
    const result = this.tools.delete(name);
    this.config.tools = Array.from(this.tools.values());
    return result;
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get the number of registered tools
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Tool implementation methods
   */
  
  async getBalance(params: Record<string, any>): Promise<AccountBalance> {
    if (!this.client) throw new Error('EVM client not initialized');
    return await this.client.getBalance(params.address);
  }

  async sendTransaction(params: Record<string, any>): Promise<TransactionResponse> {
    if (!this.client) throw new Error('EVM client not initialized');
    return await this.client.sendTransaction(params as TransactionRequest);
  }

  async estimateGas(params: Record<string, any>): Promise<GasEstimation> {
    if (!this.client) throw new Error('EVM client not initialized');
    return await this.client.estimateGas(params as TransactionRequest);
  }

  async getBlock(params: Record<string, any>): Promise<BlockInfo | null> {
    if (!this.client) throw new Error('EVM client not initialized');
    return await this.client.getBlock(params.blockNumber);
  }

  async getTransaction(params: Record<string, any>): Promise<TransactionResponse | null> {
    if (!this.client) throw new Error('EVM client not initialized');
    return await this.client.getTransaction(params.hash);
  }

  async getLogs(params: Record<string, any>): Promise<EventLog[]> {
    if (!this.client) throw new Error('EVM client not initialized');
    return await this.client.getLogs(params);
  }

  async resolveENS(params: Record<string, any>): Promise<ENSInfo> {
    if (!this.client) throw new Error('EVM client not initialized');
    return await this.client.resolveENS(params.name);
  }

  async createWallet(): Promise<WalletInfo> {
    if (!this.client) throw new Error('EVM client not initialized');
    return this.client.createWallet();
  }

  async importWallet(params: Record<string, any>): Promise<WalletInfo> {
    if (!this.client) throw new Error('EVM client not initialized');
    return this.client.importWallet(params.privateKey);
  }

  async listWallets(): Promise<{ addresses: string[] }> {
    if (!this.client) throw new Error('EVM client not initialized');
    return { addresses: this.client.getWalletAddresses() };
  }

  async switchNetwork(params: Record<string, any>): Promise<{ success: boolean; network: string }> {
    if (!this.client) throw new Error('EVM client not initialized');
    await this.client.switchNetwork(params.network);
    return { success: true, network: params.network };
  }

  async getNetwork(): Promise<any> {
    if (!this.client) throw new Error('EVM client not initialized');
    return await this.client.getNetwork();
  }

  async callContract(params: Record<string, any>): Promise<ContractCallResult> {
    if (!this.client) throw new Error('EVM client not initialized');
    return await this.client.callContract(
      params.address,
      params.abi,
      params.method,
      params.params || []
    );
  }

  async sendContractTransaction(params: Record<string, any>): Promise<ContractTransactionResult> {
    if (!this.client) throw new Error('EVM client not initialized');
    return await this.client.sendContractTransaction(
      params.address,
      params.abi,
      params.method,
      params.params || [],
      {
        from: params.from,
        value: params.value
      }
    );
  }

  async deployContract(params: Record<string, any>): Promise<any> {
    if (!this.client) throw new Error('EVM client not initialized');
    return await this.client.deployContract(
      params.abi,
      params.bytecode,
      params.params || [],
      {
        from: params.from
      }
    );
  }

  async getGasPrices(): Promise<any> {
    if (!this.client) throw new Error('EVM client not initialized');
    return await this.client.getGasPrices();
  }

  async signMessage(params: Record<string, any>): Promise<{ signature: string }> {
    if (!this.client) throw new Error('EVM client not initialized');
    const signature = await this.client.signMessage(params.message, params.address);
    return { signature };
  }

  async verifyMessage(params: Record<string, any>): Promise<{ address: string }> {
    if (!this.client) throw new Error('EVM client not initialized');
    const address = this.client.verifyMessage(params.message, params.signature);
    return { address };
  }

  /**
   * Convert OpenAI function parameters to Astreus ToolParameterSchema array
   */
  private convertOpenAISchemaToToolParameters(openAISchema: any): ToolParameterSchema[] {
    const result: ToolParameterSchema[] = [];
    
    if (!openAISchema || !openAISchema.properties) {
      return result;
    }
    
    const requiredParams = openAISchema.required || [];
    
    for (const [name, prop] of Object.entries<any>(openAISchema.properties)) {
      const parameter: ToolParameterSchema = {
        name,
        type: prop.type as any,
        description: prop.description || `Parameter ${name}`,
        required: requiredParams.includes(name)
      };
      
      if (prop.default !== undefined) {
        parameter.default = prop.default;
      }
      
      if (prop.enum) {
        parameter.description = `${parameter.description} (Allowed values: ${prop.enum.join(', ')})`;
      }
      
      result.push(parameter);
    }
    
    return result;
  }
}

// Default export
export default EVMPlugin;