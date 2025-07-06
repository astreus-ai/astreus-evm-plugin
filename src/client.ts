import { ethers } from 'ethers';
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
  COMMON_NETWORKS
} from './types';
import { logger } from '@astreus-ai/astreus';

/**
 * EVM blockchain client
 */
export class EVMClient {
  private providers: Map<string, ethers.Provider> = new Map();
  private wallets: Map<string, ethers.Wallet> = new Map();
  private config: EVMConfig;
  private currentNetwork: string;

  /**
   * Create a new EVM client
   */
  constructor(config: EVMConfig) {
    this.config = config;
    this.currentNetwork = config.defaultNetwork || 'mainnet';
    
    // Initialize providers and wallets
    this.initializeProviders();
    this.initializeWallets();
  }

  /**
   * Initialize network providers
   */
  private initializeProviders(): void {
    const networks = this.config.networks || {};
    
    // Add common networks if not already configured
    for (const [key, network] of Object.entries(COMMON_NETWORKS)) {
      if (!networks[key]) {
        networks[key] = network;
      }
    }

    // Create providers for each network
    for (const [key, network] of Object.entries(networks)) {
      try {
        const provider = new ethers.JsonRpcProvider(
          network.rpcUrl,
          {
            name: network.name,
            chainId: network.chainId
          }
        );
        this.providers.set(key, provider);
        logger.debug("EVM Client", "Provider", `Initialized provider for ${network.name}`);
      } catch (error) {
        logger.error("EVM Client", "Provider", `Failed to initialize provider for ${network.name}: ${error}`);
      }
    }
  }

  /**
   * Initialize wallets from private keys or mnemonic
   */
  private initializeWallets(): void {
    const provider = this.getProvider();
    
    if (this.config.privateKeys && this.config.privateKeys.length > 0) {
      // Initialize wallets from private keys
      this.config.privateKeys.forEach((privateKey, index) => {
        try {
          const wallet = new ethers.Wallet(privateKey, provider);
          this.wallets.set(wallet.address, wallet);
          logger.debug("EVM Client", "Wallet", `Initialized wallet ${index}: ${wallet.address}`);
        } catch (error) {
          logger.error("EVM Client", "Wallet", `Failed to initialize wallet from private key: ${error}`);
        }
      });
    }
    
    if (this.config.mnemonic) {
      // Initialize HD wallet from mnemonic
      try {
        const hdPath = this.config.hdPath || "m/44'/60'/0'/0";
        const startIndex = this.config.accountIndex || 0;
        
        // Create 10 wallets by default
        for (let i = 0; i < 10; i++) {
          const path = `${hdPath}/${startIndex + i}`;
          const wallet = ethers.HDNodeWallet.fromMnemonic(
            ethers.Mnemonic.fromPhrase(this.config.mnemonic),
            path
          ).connect(provider);
          
          this.wallets.set(wallet.address, wallet as unknown as ethers.Wallet);
          logger.debug("EVM Client", "HD Wallet", `Initialized HD wallet ${i}: ${wallet.address} (${path})`);
        }
      } catch (error) {
        logger.error("EVM Client", "HD Wallet", `Failed to initialize HD wallet: ${error}`);
      }
    }
  }

  /**
   * Get the current network provider
   */
  getProvider(network?: string): ethers.Provider {
    const networkKey = network || this.currentNetwork;
    const provider = this.providers.get(networkKey);
    
    if (!provider) {
      throw new Error(`Provider not found for network: ${networkKey}`);
    }
    
    return provider;
  }

  /**
   * Switch to a different network
   */
  async switchNetwork(network: string): Promise<void> {
    if (!this.providers.has(network)) {
      throw new Error(`Network not configured: ${network}`);
    }
    
    this.currentNetwork = network;
    logger.info("EVM Client", "Network", `Switched to network: ${network}`);
    
    // Re-connect wallets to new provider
    const provider = this.getProvider();
    for (const [address, wallet] of this.wallets.entries()) {
      this.wallets.set(address, wallet.connect(provider));
    }
  }

  /**
   * Get current network information
   */
  async getNetwork(): Promise<NetworkConfig | null> {
    const provider = this.getProvider();
    const network = await provider.getNetwork();
    
    const networks = { ...COMMON_NETWORKS, ...(this.config.networks || {}) };
    const networkConfig = Object.values(networks).find(n => n.chainId === Number(network.chainId));
    
    return networkConfig || null;
  }

  /**
   * Get account balance
   */
  async getBalance(address: string): Promise<AccountBalance> {
    const provider = this.getProvider();
    
    const balance = await provider.getBalance(address);
    const nonce = await provider.getTransactionCount(address);
    
    return {
      address,
      balance: balance.toString(),
      formattedBalance: ethers.formatEther(balance),
      nonce
    };
  }

  /**
   * Send native currency (ETH, MATIC, etc.)
   */
  async sendTransaction(request: TransactionRequest): Promise<TransactionResponse> {
    const provider = this.getProvider();
    
    // Get wallet
    const wallet = request.from ? this.wallets.get(request.from) : Array.from(this.wallets.values())[0];
    if (!wallet) {
      throw new Error('No wallet available for sending transaction');
    }

    // Build transaction
    const tx: ethers.TransactionRequest = {
      to: request.to,
      value: request.value ? ethers.parseEther(request.value) : 0,
      data: request.data || '0x',
      nonce: request.nonce,
      chainId: request.chainId
    };

    // Set gas parameters
    if (request.gasLimit) {
      tx.gasLimit = BigInt(request.gasLimit);
    }
    
    // EIP-1559 transaction
    if (request.maxFeePerGas && request.maxPriorityFeePerGas) {
      tx.maxFeePerGas = BigInt(request.maxFeePerGas);
      tx.maxPriorityFeePerGas = BigInt(request.maxPriorityFeePerGas);
    } else if (request.gasPrice) {
      tx.gasPrice = BigInt(request.gasPrice);
    }

    logger.info("EVM Client", "Transaction", `Sending ${request.value || '0'} ETH from ${wallet.address} to ${request.to}`);

    // Send transaction
    const txResponse = await wallet.sendTransaction(tx);
    logger.info("EVM Client", "Transaction", `Transaction sent: ${txResponse.hash}`);

    // Wait for confirmation
    const receipt = await txResponse.wait();
    logger.info("EVM Client", "Transaction", `Transaction confirmed in block ${receipt?.blockNumber}`);

    return {
      hash: txResponse.hash,
      from: txResponse.from,
      to: txResponse.to || '',
      value: txResponse.value.toString(),
      data: txResponse.data,
      gasLimit: txResponse.gasLimit.toString(),
      gasPrice: txResponse.gasPrice?.toString(),
      maxFeePerGas: txResponse.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: txResponse.maxPriorityFeePerGas?.toString(),
      nonce: txResponse.nonce,
      chainId: Number(txResponse.chainId),
      blockNumber: receipt?.blockNumber,
      blockHash: receipt?.blockHash,
      status: receipt?.status ?? undefined
    };
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(request: TransactionRequest): Promise<GasEstimation> {
    const provider = this.getProvider();
    
    const tx: ethers.TransactionRequest = {
      to: request.to,
      value: request.value ? ethers.parseEther(request.value) : 0,
      data: request.data || '0x',
      from: request.from
    };

    const gasLimit = await provider.estimateGas(tx);
    const feeData = await provider.getFeeData();

    let estimatedCost = '0';
    
    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      // EIP-1559
      estimatedCost = ethers.formatEther(gasLimit * feeData.maxFeePerGas);
      
      return {
        gasLimit: gasLimit.toString(),
        maxFeePerGas: feeData.maxFeePerGas.toString(),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.toString(),
        estimatedCost
      };
    } else if (feeData.gasPrice) {
      // Legacy
      estimatedCost = ethers.formatEther(gasLimit * feeData.gasPrice);
      
      return {
        gasLimit: gasLimit.toString(),
        gasPrice: feeData.gasPrice.toString(),
        estimatedCost
      };
    }

    return {
      gasLimit: gasLimit.toString(),
      estimatedCost
    };
  }

  /**
   * Get block information
   */
  async getBlock(blockNumber?: number): Promise<BlockInfo | null> {
    const provider = this.getProvider();
    const block = await provider.getBlock(blockNumber || 'latest');
    
    if (!block) {
      return null;
    }

    return {
      number: block.number,
      hash: block.hash || '',
      parentHash: block.parentHash,
      timestamp: block.timestamp,
      gasLimit: block.gasLimit.toString(),
      gasUsed: block.gasUsed.toString(),
      baseFeePerGas: block.baseFeePerGas?.toString(),
      transactions: [...block.transactions]
    };
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(hash: string): Promise<TransactionResponse | null> {
    const provider = this.getProvider();
    const tx = await provider.getTransaction(hash);
    
    if (!tx) {
      return null;
    }

    const receipt = await tx.wait();

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to || '',
      value: tx.value.toString(),
      data: tx.data,
      gasLimit: tx.gasLimit.toString(),
      gasPrice: tx.gasPrice?.toString(),
      maxFeePerGas: tx.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
      nonce: tx.nonce,
      chainId: Number(tx.chainId),
      blockNumber: receipt?.blockNumber,
      blockHash: receipt?.blockHash,
      status: receipt?.status ?? undefined
    };
  }

  /**
   * Get logs/events
   */
  async getLogs(filter: ethers.Filter): Promise<EventLog[]> {
    const provider = this.getProvider();
    const logs = await provider.getLogs(filter);
    
    return logs.map(log => ({
      address: log.address,
      topics: [...log.topics],
      data: log.data,
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      transactionIndex: log.transactionIndex,
      logIndex: log.index,
      removed: log.removed
    }));
  }

  /**
   * Resolve ENS name
   */
  async resolveENS(name: string): Promise<ENSInfo> {
    const provider = this.getProvider();
    
    const address = await provider.resolveName(name);
    const resolver = await (provider as any).getResolver?.(name);
    
    const info: ENSInfo = {
      name,
      address: address || undefined
    };
    
    if (resolver) {
      info.resolver = await resolver.getAddress();
      
      try {
        const avatar = await resolver.getAvatar();
        if (avatar) {
          info.avatar = avatar;
        }
      } catch (error) {
        // Avatar might not be set
      }
    }
    
    return info;
  }

  /**
   * Create a new wallet
   */
  createWallet(): WalletInfo {
    const wallet = ethers.Wallet.createRandom();
    const provider = this.getProvider();
    const connectedWallet = wallet.connect(provider);
    
    this.wallets.set(wallet.address, connectedWallet as unknown as ethers.Wallet);
    
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: (wallet as any).publicKey,
      mnemonic: wallet.mnemonic?.phrase
    };
  }

  /**
   * Import wallet from private key
   */
  importWallet(privateKey: string): WalletInfo {
    const provider = this.getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    
    this.wallets.set(wallet.address, wallet);
    
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: (wallet as any).publicKey
    };
  }

  /**
   * Get all wallet addresses
   */
  getWalletAddresses(): string[] {
    return Array.from(this.wallets.keys());
  }

  /**
   * Call a smart contract (read-only)
   */
  async callContract(
    contractAddress: string,
    abi: any[],
    method: string,
    params: any[] = []
  ): Promise<ContractCallResult> {
    try {
      const provider = this.getProvider();
      const contract = new ethers.Contract(contractAddress, abi, provider);
      
      const result = await contract[method](...params);
      
      return {
        result,
        decoded: result
      };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Send a smart contract transaction
   */
  async sendContractTransaction(
    contractAddress: string,
    abi: any[],
    method: string,
    params: any[] = [],
    options: {
      from?: string;
      value?: string;
      gasLimit?: string;
    } = {}
  ): Promise<ContractTransactionResult> {
    try {
      // Get wallet
      const wallet = options.from 
        ? this.wallets.get(options.from) 
        : Array.from(this.wallets.values())[0];
        
      if (!wallet) {
        throw new Error('No wallet available for sending transaction');
      }

      const contract = new ethers.Contract(contractAddress, abi, wallet);
      
      // Prepare transaction options
      const txOptions: any = {};
      if (options.value) {
        txOptions.value = ethers.parseEther(options.value);
      }
      if (options.gasLimit) {
        txOptions.gasLimit = BigInt(options.gasLimit);
      }

      logger.info("EVM Client", "Contract", `Calling ${method} on ${contractAddress}`);

      // Send transaction
      const tx = await contract[method](...params, txOptions);
      logger.info("EVM Client", "Contract", `Transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();
      logger.info("EVM Client", "Contract", `Transaction confirmed in block ${receipt.blockNumber}`);

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value.toString(),
        data: tx.data,
        receipt
      };
    } catch (error) {
      return {
        hash: '',
        from: '',
        to: contractAddress,
        value: '0',
        data: '0x',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Deploy a smart contract
   */
  async deployContract(
    abi: any[],
    bytecode: string,
    params: any[] = [],
    options: {
      from?: string;
      gasLimit?: string;
    } = {}
  ): Promise<ContractInterface & { transactionHash: string }> {
    // Get wallet
    const wallet = options.from 
      ? this.wallets.get(options.from) 
      : Array.from(this.wallets.values())[0];
      
    if (!wallet) {
      throw new Error('No wallet available for deployment');
    }

    const contractFactory = new ethers.ContractFactory(abi, bytecode, wallet);
    
    logger.info("EVM Client", "Deploy", `Deploying contract...`);

    // Deploy contract
    const contract = await contractFactory.deploy(...params, {
      gasLimit: options.gasLimit ? BigInt(options.gasLimit) : undefined
    });

    logger.info("EVM Client", "Deploy", `Contract deployment tx: ${contract.deploymentTransaction()?.hash}`);

    // Wait for deployment
    await contract.waitForDeployment();
    const address = await contract.getAddress();

    logger.info("EVM Client", "Deploy", `Contract deployed at: ${address}`);

    return {
      address,
      abi,
      transactionHash: contract.deploymentTransaction()?.hash || ''
    };
  }

  /**
   * Get current gas prices
   */
  async getGasPrices(): Promise<{
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  }> {
    const provider = this.getProvider();
    const feeData = await provider.getFeeData();
    
    return {
      gasPrice: feeData.gasPrice?.toString(),
      maxFeePerGas: feeData.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString()
    };
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(hash: string, confirmations = 1): Promise<ethers.TransactionReceipt | null> {
    const provider = this.getProvider();
    return await provider.waitForTransaction(hash, confirmations);
  }

  /**
   * Sign a message
   */
  async signMessage(message: string, address?: string): Promise<string> {
    const wallet = address 
      ? this.wallets.get(address) 
      : Array.from(this.wallets.values())[0];
      
    if (!wallet) {
      throw new Error('No wallet available for signing');
    }

    return await wallet.signMessage(message);
  }

  /**
   * Verify a signed message
   */
  verifyMessage(message: string, signature: string): string {
    return ethers.verifyMessage(message, signature);
  }
}