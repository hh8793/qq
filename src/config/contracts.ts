import { ethers, Contract, Signer } from 'ethers';
import { logger } from '../utils/logger';
import { config } from './index';

// 合约ABI（简化版，实际应从构建的合约文件导入）
const AGENT_REGISTRY_ABI = [
  'function registerAgent(address agentAddress, string name, string metadataURI, uint8 agentType) external',
  'function updateAgentMetadata(address agentAddress, string metadataURI) external',
  'function deposit() external payable',
  'function withdraw(uint256 amount) external',
  'function getAgent(address agentAddress) external view returns (tuple(address owner, string name, string metadataURI, uint8 agentType, bool isActive, uint256 balance, uint256 reputation, uint256 createdAt, uint256 updatedAt))',
  'function getAgentCount() external view returns (uint256)',
];

const SETTLEMENT_CONTRACT_ABI = [
  'function initiateSettlement(address toAgent, uint256 serviceId, uint256 units, string serviceType, string transactionHash) external',
  'function verifyAndSettle(uint256 transactionId, bytes kpiData, bool verified) external',
  'function registerService(string serviceType, uint256 pricePerUnit, uint8 pricingType, bytes32 kpiHash) external',
  'function updateServicePrice(uint256 serviceId, uint256 newPrice) external',
  'function getTransaction(uint256 transactionId) external view returns (tuple(uint256 id, address fromAgent, address toAgent, uint256 amount, string serviceType, string transactionHash, uint8 status, uint256 timestamp, uint256 blockNumber))',
  'function getService(uint256 serviceId) external view returns (tuple(uint256 id, address providerAgent, string serviceType, uint256 pricePerUnit, uint8 pricingType, bool isAvailable, bytes32 kpiHash))',
  'function getStatistics() external view returns (tuple(uint256 totalTransactions, uint256 completedTransactions, uint256 pendingTransactions, uint256 failedTransactions, uint256 totalAmount))',
];

const PAYMENT_CHANNEL_ABI = [
  'function openChannel(address recipient, uint256 amount, uint256 expiration) external',
  'function claimPayment(uint256 channelId, uint256 amount, uint256 nonce, bytes signature) external',
  'function closeChannel(uint256 channelId) external',
  'function addFunds(uint256 channelId, uint256 amount) external',
  'function getChannel(uint256 channelId) external view returns (tuple(address sender, address recipient, uint256 balance, uint256 amountWithdrawn, uint256 expiration, bool isOpen))',
];

const SUBSCRIPTION_MANAGER_ABI = [
  'function createSubscription(address provider, uint256 serviceId, uint256 amount, uint256 billingCycle) external',
  'function processPayment(uint256 subscriptionId) external',
  'function cancelSubscription(uint256 subscriptionId) external',
  'function updateSubscription(uint256 subscriptionId, uint256 newAmount, uint256 newBillingCycle) external',
  'function getSubscription(uint256 subscriptionId) external view returns (tuple(uint256 id, address subscriber, address provider, uint256 serviceId, uint256 amount, uint256 billingCycle, uint256 nextBillingDate, bool isActive, uint256 createdAt))',
  'function getDueSubscriptions() external view returns (uint256[])',
];

let provider: ethers.JsonRpcProvider | null = null;
let signer: Signer | null = null;

let agentRegistry: Contract | null = null;
let settlementContract: Contract | null = null;
let paymentChannel: Contract | null = null;
let subscriptionManager: Contract | null = null;

export async function initializeContracts(): Promise<void> {
  try {
    if (!config.blockchain.rpcUrl) {
      logger.warn('Blockchain RPC URL not configured, skipping contract initialization');
      return;
    }

    // 初始化Provider
    provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
    logger.info(`Connected to blockchain network: ${config.blockchain.network}`);

    // 初始化Signer（如果有私钥）
    if (config.blockchain.privateKey) {
      signer = new ethers.Wallet(config.blockchain.privateKey, provider);
      const signerAddress = await signer.getAddress();
      logger.info(`Signer initialized: ${signerAddress}`);
    }

    // 初始化合约（如果有合约地址）
    if (config.blockchain.contractAddress) {
      agentRegistry = new Contract(
        config.blockchain.contractAddress,
        AGENT_REGISTRY_ABI,
        signer || provider
      );

      // 假设其他合约地址在数据库中或通过配置管理
      // settlementContract = new Contract(...)
      // paymentChannel = new Contract(...)
      // subscriptionManager = new Contract(...)

      logger.info('Smart contracts initialized successfully');
    } else {
      logger.warn('Contract addresses not configured, contracts will be initialized later');
    }
  } catch (error) {
    logger.error('Failed to initialize contracts:', error);
    throw error;
  }
}

export function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    throw new Error('Provider not initialized');
  }
  return provider;
}

export function getSigner(): Signer {
  if (!signer) {
    throw new Error('Signer not initialized');
  }
  return signer;
}

export function getAgentRegistry(): Contract {
  if (!agentRegistry) {
    throw new Error('AgentRegistry contract not initialized');
  }
  return agentRegistry;
}

export function getSettlementContract(): Contract {
  if (!settlementContract) {
    throw new Error('SettlementContract not initialized');
  }
  return settlementContract;
}

export function getPaymentChannel(): Contract {
  if (!paymentChannel) {
    throw new Error('PaymentChannel contract not initialized');
  }
  return paymentChannel;
}

export function getSubscriptionManager(): Contract {
  if (!subscriptionManager) {
    throw new Error('SubscriptionManager contract not initialized');
  }
  return subscriptionManager;
}

// 动态设置合约地址
export function setAgentRegistryAddress(address: string): void {
  const contract = new Contract(
    address,
    AGENT_REGISTRY_ABI,
    signer || getProvider()
  );
  agentRegistry = contract;
  logger.info(`AgentRegistry contract address updated: ${address}`);
}

export function setSettlementContractAddress(address: string): void {
  const contract = new Contract(
    address,
    SETTLEMENT_CONTRACT_ABI,
    signer || getProvider()
  );
  settlementContract = contract;
  logger.info(`SettlementContract address updated: ${address}`);
}

export function setPaymentChannelAddress(address: string): void {
  const contract = new Contract(
    address,
    PAYMENT_CHANNEL_ABI,
    signer || getProvider()
  );
  paymentChannel = contract;
  logger.info(`PaymentChannel address updated: ${address}`);
}

export function setSubscriptionManagerAddress(address: string): void {
  const contract = new Contract(
    address,
    SUBSCRIPTION_MANAGER_ABI,
    signer || getProvider()
  );
  subscriptionManager = contract;
  logger.info(`SubscriptionManager address updated: ${address}`);
}
