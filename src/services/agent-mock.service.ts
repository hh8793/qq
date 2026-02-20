import { logger } from '../utils/logger';
import { mockQuery } from '../config/database-mock';

export interface Agent {
  id?: number;
  walletAddress: string;
  ownerAddress: string;
  name: string;
  type: string;
  metadataUri?: string;
  isActive?: boolean;
  reputationScore?: number;
  balance?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  type?: string;
  isActive?: boolean;
}

export interface PaginatedResult<T> {
  agents: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class AgentService {
  async registerAgent(data: Omit<Agent, 'id' | 'isActive' | 'reputationScore' | 'balance' | 'createdAt' | 'updatedAt'>): Promise<Agent> {
    const agent = await mockQuery.agents.create(data);
    logger.info(`Agent registered: ${data.walletAddress}`);
    return agent as Agent;
  }

  async getAgentById(id: number): Promise<Agent | null> {
    const agent = await mockQuery.agents.findById(id);
    return agent as Agent || null;
  }

  async getAgentByWalletAddress(walletAddress: string): Promise<Agent | null> {
    const agent = await mockQuery.agents.findByWallet(walletAddress);
    return agent as Agent || null;
  }

  async getAllAgents(options: PaginationOptions): Promise<PaginatedResult<Agent>> {
    let agents = await mockQuery.agents.findAll();
    
    // 过滤
    if (options.type) {
      agents = agents.filter(a => (a as any).type === options.type);
    }
    if (options.isActive !== undefined) {
      agents = agents.filter(a => (a as any).isActive === options.isActive);
    }
    
    const total = agents.length;
    const offset = (options.page - 1) * options.limit;
    const paginatedAgents = agents.slice(offset, offset + options.limit);
    
    return {
      agents: paginatedAgents as Agent[],
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  async updateAgent(id: number, data: Partial<Pick<Agent, 'metadataUri'>>): Promise<Agent | null> {
    const agent = await mockQuery.agents.update(id, data);
    logger.info(`Agent updated: ${id}`);
    return agent as Agent || null;
  }

  async activateAgent(id: number): Promise<Agent | null> {
    const agent = await mockQuery.agents.update(id, { isActive: true });
    logger.info(`Agent activated: ${id}`);
    return agent as Agent || null;
  }

  async deactivateAgent(id: number): Promise<Agent | null> {
    const agent = await mockQuery.agents.findById(id);
    if (!agent) return null;
    
    if ((agent as any).balance !== '0') {
      throw new Error('Cannot deactivate agent with balance');
    }
    
    const updatedAgent = await mockQuery.agents.update(id, { isActive: false });
    logger.info(`Agent deactivated: ${id}`);
    return updatedAgent as Agent || null;
  }

  async deposit(id: number, amount: string): Promise<Agent | null> {
    const agent = await mockQuery.agents.findById(id);
    if (!agent) return null;
    
    const newBalance = (parseFloat((agent as any).balance) + parseFloat(amount)).toFixed(8);
    const updatedAgent = await mockQuery.agents.update(id, { balance: newBalance });
    
    logger.info(`Deposit made to agent ${id}: ${amount}`);
    return updatedAgent as Agent || null;
  }

  async withdraw(id: number, amount: string): Promise<Agent | null> {
    const agent = await mockQuery.agents.findById(id);
    if (!agent) return null;
    
    const currentBalance = parseFloat((agent as any).balance);
    const withdrawAmount = parseFloat(amount);
    
    if (currentBalance < withdrawAmount) {
      throw new Error('Insufficient balance');
    }
    
    const newBalance = (currentBalance - withdrawAmount).toFixed(8);
    const updatedAgent = await mockQuery.agents.update(id, { balance: newBalance });
    
    logger.info(`Withdrawal from agent ${id}: ${amount}`);
    return updatedAgent as Agent || null;
  }

  async getBalance(id: number): Promise<string> {
    const agent = await mockQuery.agents.findById(id);
    if (!agent) {
      throw new Error('Agent not found');
    }
    return (agent as any).balance;
  }
}
