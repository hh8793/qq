import { getPool } from '../config/database';
import { logger } from '../utils/logger';

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
    const pool = await getPool();

    const query = `
      INSERT INTO agents (wallet_address, owner_address, name, type, metadata_uri, is_active, reputation_score, balance)
      VALUES ($1, $2, $3, $4, $5, true, 100, 0)
      RETURNING *
    `;

    const values = [
      data.walletAddress.toLowerCase(),
      data.ownerAddress.toLowerCase(),
      data.name,
      data.type,
      data.metadataUri || null,
    ];

    try {
      const result = await pool.query(query, values);
      logger.info(`Agent registered: ${data.walletAddress}`);
      return this.mapDbToAgent(result.rows[0]);
    } catch (error) {
      logger.error('Failed to register agent:', error);
      throw error;
    }
  }

  async getAgentById(id: number): Promise<Agent | null> {
    const pool = await getPool();

    const query = 'SELECT * FROM agents WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbToAgent(result.rows[0]);
  }

  async getAgentByWalletAddress(walletAddress: string): Promise<Agent | null> {
    const pool = await getPool();

    const query = 'SELECT * FROM agents WHERE wallet_address = $1';
    const result = await pool.query(query, [walletAddress.toLowerCase()]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbToAgent(result.rows[0]);
  }

  async getAllAgents(options: PaginationOptions): Promise<PaginatedResult<Agent>> {
    const pool = await getPool();

    let whereClause = '';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (options.type) {
      whereClause += ` AND type = $${paramIndex}`;
      queryParams.push(options.type);
      paramIndex++;
    }

    if (options.isActive !== undefined) {
      whereClause += ` AND is_active = $${paramIndex}`;
      queryParams.push(options.isActive);
      paramIndex++;
    }

    // 获取总数
    const countQuery = `SELECT COUNT(*) FROM agents WHERE 1=1 ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // 获取分页数据
    const offset = (options.page - 1) * options.limit;
    const dataQuery = `
      SELECT * FROM agents
      WHERE 1=1 ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(options.limit, offset);

    const dataResult = await pool.query(dataQuery, queryParams);
    const agents = dataResult.rows.map(this.mapDbToAgent);

    return {
      agents,
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  async updateAgent(id: number, data: Partial<Pick<Agent, 'metadataUri'>>): Promise<Agent | null> {
    const pool = await getPool();

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.metadataUri !== undefined) {
      updateFields.push(`metadata_uri = $${paramIndex}`);
      values.push(data.metadataUri);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE agents
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`Agent updated: ${id}`);
    return this.mapDbToAgent(result.rows[0]);
  }

  async activateAgent(id: number): Promise<Agent | null> {
    const pool = await getPool();

    const query = `
      UPDATE agents
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`Agent activated: ${id}`);
    return this.mapDbToAgent(result.rows[0]);
  }

  async deactivateAgent(id: number): Promise<Agent | null> {
    const pool = await getPool();

    const query = `
      UPDATE agents
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND balance = 0
      RETURNING *
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`Agent deactivated: ${id}`);
    return this.mapDbToAgent(result.rows[0]);
  }

  async deposit(id: number, amount: string): Promise<Agent | null> {
    const pool = await getPool();

    const query = `
      UPDATE agents
      SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_active = true
      RETURNING *
    `;

    const result = await pool.query(query, [amount, id]);

    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`Deposit made to agent ${id}: ${amount}`);
    return this.mapDbToAgent(result.rows[0]);
  }

  async withdraw(id: number, amount: string): Promise<Agent | null> {
    const pool = await getPool();

    const query = `
      UPDATE agents
      SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_active = true AND balance >= $1
      RETURNING *
    `;

    const result = await pool.query(query, [amount, id]);

    if (result.rows.length === 0) {
      throw new Error('Insufficient balance or agent not active');
    }

    logger.info(`Withdrawal from agent ${id}: ${amount}`);
    return this.mapDbToAgent(result.rows[0]);
  }

  async getBalance(id: number): Promise<string> {
    const pool = await getPool();

    const query = 'SELECT balance FROM agents WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      throw new Error('Agent not found');
    }

    return result.rows[0].balance;
  }

  private mapDbToAgent(row: any): Agent {
    return {
      id: row.id,
      walletAddress: row.wallet_address,
      ownerAddress: row.owner_address,
      name: row.name,
      type: row.type,
      metadataUri: row.metadata_uri,
      isActive: row.is_active,
      reputationScore: row.reputation_score,
      balance: row.balance,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
