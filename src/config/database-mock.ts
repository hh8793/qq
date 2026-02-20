import { logger } from '../utils/logger';

// 模拟数据库存储（用于开发测试）
export const mockData = {
  agents: [
    {
      id: 1,
      walletAddress: '0x1234567890123456789012345678901234567890',
      ownerAddress: '0x1234567890123456789012345678901234567890',
      name: '营销智能体 Alpha',
      type: 'MARKETING',
      metadataUri: null,
      isActive: true,
      reputationScore: 100,
      balance: '10.5',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: 2,
      walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
      ownerAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
      name: '供应链智能体 Beta',
      type: 'SUPPLY_CHAIN',
      metadataUri: null,
      isActive: true,
      reputationScore: 95,
      balance: '25.8',
      createdAt: new Date('2024-01-16'),
      updatedAt: new Date('2024-01-16'),
    },
    {
      id: 3,
      walletAddress: '0x9876543210987654321098765432109876543210',
      ownerAddress: '0x9876543210987654321098765432109876543210',
      name: '内容创作智能体 Gamma',
      type: 'CONTENT',
      metadataUri: null,
      isActive: false,
      reputationScore: 88,
      balance: '0.0',
      createdAt: new Date('2024-01-17'),
      updatedAt: new Date('2024-01-17'),
    },
  ],
  
  transactions: [
    {
      id: 1,
      transactionHash: '0xabcd1234567890abcdef1234567890abcdef1234567890abcdef12',
      fromAgentId: 1,
      toAgentId: 2,
      serviceId: 1,
      amount: '2.5',
      serviceType: '素材生成',
      status: 'COMPLETED',
      platformFee: '0.05',
      chainTxHash: null,
      createdAt: new Date('2024-01-20T10:30:00'),
      updatedAt: new Date('2024-01-20T10:30:00'),
    },
    {
      id: 2,
      transactionHash: '0xefgh1234567890abcdef1234567890abcdef1234567890abcdef34',
      fromAgentId: 3,
      toAgentId: 1,
      serviceId: 2,
      amount: '1.8',
      serviceType: '内容创作',
      status: 'PENDING',
      platformFee: '0.036',
      chainTxHash: null,
      createdAt: new Date('2024-01-20T11:15:00'),
      updatedAt: new Date('2024-01-20T11:15:00'),
    },
  ],
  
  services: [
    {
      id: 1,
      agentId: 3,
      serviceType: '文章生成',
      pricePerUnit: '0.5',
      pricingType: 'PER_UNIT',
      isAvailable: true,
      kpiHash: null,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: 2,
      agentId: 2,
      serviceType: '素材生成',
      pricePerUnit: '2.5',
      pricingType: 'FIXED',
      isAvailable: true,
      kpiHash: null,
      createdAt: new Date('2024-01-16'),
      updatedAt: new Date('2024-01-16'),
    },
  ],
  
  subscriptions: [
    {
      id: 1,
      subscriberAgentId: 1,
      providerAgentId: 3,
      serviceId: 1,
      amount: '5.0',
      billingCycle: 2592000, // 30天
      nextBillingDate: new Date('2024-02-20'),
      isActive: true,
      chainSubscriptionId: null,
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20'),
    },
  ],
};

let agentIdCounter = 4;
let transactionIdCounter = 3;
let serviceIdCounter = 3;
let subscriptionIdCounter = 2;

export async function initDatabase(): Promise<void> {
  logger.info('Mock database initialized successfully');
}

export async function getPool(): Promise<any> {
  return null; // Mock implementation
}

export async function closeDatabase(): Promise<void> {
  logger.info('Mock database connection closed');
}

// Mock query functions for services to use
export const mockQuery = {
  agents: {
    findAll: () => Promise.resolve(mockData.agents),
    findById: (id: number) => Promise.resolve(mockData.agents.find(a => a.id === id)),
    findByWallet: (address: string) => Promise.resolve(mockData.agents.find(a => a.walletAddress.toLowerCase() === address.toLowerCase())),
    create: (data: any) => {
      const newAgent = {
        id: agentIdCounter++,
        ...data,
        isActive: true,
        reputationScore: 100,
        balance: '0',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockData.agents.push(newAgent);
      return Promise.resolve(newAgent);
    },
    update: (id: number, data: any) => {
      const agent = mockData.agents.find(a => a.id === id);
      if (agent) {
        Object.assign(agent, data, { updatedAt: new Date() });
      }
      return Promise.resolve(agent);
    },
  },
  
  transactions: {
    findAll: () => Promise.resolve(mockData.transactions),
    findById: (id: number) => Promise.resolve(mockData.transactions.find(t => t.id === id)),
    findByAgent: (agentId: number) => Promise.resolve(mockData.transactions.filter(t => t.fromAgentId === agentId || t.toAgentId === agentId)),
    create: (data: any) => {
      const newTx = {
        id: transactionIdCounter++,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockData.transactions.push(newTx);
      return Promise.resolve(newTx);
    },
    update: (id: number, data: any) => {
      const tx = mockData.transactions.find(t => t.id === id);
      if (tx) {
        Object.assign(tx, data, { updatedAt: new Date() });
      }
      return Promise.resolve(tx);
    },
  },
  
  services: {
    findAll: () => Promise.resolve(mockData.services),
    findById: (id: number) => Promise.resolve(mockData.services.find(s => s.id === id)),
    findByAgent: (agentId: number) => Promise.resolve(mockData.services.filter(s => s.agentId === agentId)),
    create: (data: any) => {
      const newService = {
        id: serviceIdCounter++,
        ...data,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockData.services.push(newService);
      return Promise.resolve(newService);
    },
  },
  
  subscriptions: {
    findAll: () => Promise.resolve(mockData.subscriptions),
    findById: (id: number) => Promise.resolve(mockData.subscriptions.find(s => s.id === id)),
    findBySubscriber: (agentId: number) => Promise.resolve(mockData.subscriptions.filter(s => s.subscriberAgentId === agentId)),
    findByProvider: (agentId: number) => Promise.resolve(mockData.subscriptions.filter(s => s.providerAgentId === agentId)),
    create: (data: any) => {
      const newSub = {
        id: subscriptionIdCounter++,
        ...data,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockData.subscriptions.push(newSub);
      return Promise.resolve(newSub);
    },
  },
};
