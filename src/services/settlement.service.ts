import { getPool } from '../config/database';
import { logger } from '../utils/logger';

export interface Transaction {
  id?: number;
  transactionHash: string;
  fromAgentId: number;
  toAgentId: number;
  serviceId: number;
  amount: string;
  serviceType?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  platformFee?: string;
  chainTxHash?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Service {
  id?: number;
  agentId: number;
  serviceType: string;
  pricePerUnit: string;
  pricingType: 'FIXED' | 'PER_UNIT' | 'PERFORMANCE_BASED' | 'SUBSCRIPTION';
  isAvailable?: boolean;
  kpiHash?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  status?: string;
}

export interface PaginatedResult<T> {
  transactions: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ServicePaginationOptions {
  page: number;
  limit: number;
  providerId?: number;
  serviceType?: string;
}

export class SettlementService {
  async initiateSettlement(data: Omit<Transaction, 'id' | 'status' | 'platformFee' | 'chainTxHash' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const pool = await getPool();

    // 验证服务
    const serviceQuery = 'SELECT * FROM services WHERE id = $1 AND is_available = true';
    const serviceResult = await pool.query(serviceQuery, [data.serviceId]);

    if (serviceResult.rows.length === 0) {
      throw new Error('Service not found or not available');
    }

    const service = serviceResult.rows[0];
    let amount: string;
    let platformFee: string = '0';

    // 根据定价类型计算金额
    if (service.pricing_type === 'FIXED') {
      amount = service.price_per_unit;
    } else if (service.pricing_type === 'PER_UNIT') {
      amount = (parseFloat(service.price_per_unit) * data.units).toString();
    } else if (service.pricing_type === 'SUBSCRIPTION') {
      amount = service.price_per_unit;
    } else {
      // PERFORMANCE_BASED 需要后续验证
      amount = '0';
    }

    // 计算平台费用 (2%)
    if (parseFloat(amount) > 0) {
      platformFee = (parseFloat(amount) * 0.02).toString();
    }

    // 插入交易记录
    const query = `
      INSERT INTO transactions (
        transaction_hash, from_agent_id, to_agent_id, service_id, amount, 
        service_type, status, platform_fee
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      data.transactionHash,
      data.fromAgentId,
      data.toAgentId,
      data.serviceId,
      amount,
      data.serviceType || service.service_type,
      service.pricing_type === 'PERFORMANCE_BASED' ? 'PENDING' : 'COMPLETED',
      platformFee,
    ];

    try {
      const result = await pool.query(query, values);
      logger.info(`Settlement initiated: ${data.transactionHash}`);
      return this.mapDbToTransaction(result.rows[0]);
    } catch (error) {
      logger.error('Failed to initiate settlement:', error);
      throw error;
    }
  }

  async getTransactionById(id: number): Promise<Transaction | null> {
    const pool = await getPool();

    const query = 'SELECT * FROM transactions WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbToTransaction(result.rows[0]);
  }

  async getTransactionsByAgent(options: PaginationOptions & { agentId: number }): Promise<PaginatedResult<Transaction>> {
    const pool = await getPool();

    let whereClause = `WHERE from_agent_id = $1 OR to_agent_id = $1`;
    const queryParams: any[] = [options.agentId];
    let paramIndex = 2;

    if (options.status) {
      whereClause += ` AND status = $${paramIndex}`;
      queryParams.push(options.status);
      paramIndex++;
    }

    // 获取总数
    const countQuery = `SELECT COUNT(*) FROM transactions ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // 获取分页数据
    const offset = (options.page - 1) * options.limit;
    const dataQuery = `
      SELECT * FROM transactions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(options.limit, offset);

    const dataResult = await pool.query(dataQuery, queryParams);
    const transactions = dataResult.rows.map(this.mapDbToTransaction);

    return {
      transactions,
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  async verifyAndSettle(data: { transactionId: number; kpiData: string; verified: boolean }): Promise<Transaction | null> {
    const pool = await getPool();

    const query = `
      UPDATE transactions
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const status = data.verified ? 'COMPLETED' : 'FAILED';
    const result = await pool.query(query, [status, data.transactionId]);

    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`Transaction verified and settled: ${data.transactionId}, status: ${status}`);
    return this.mapDbToTransaction(result.rows[0]);
  }

  async getStatistics(): Promise<any> {
    const pool = await getPool();

    const query = `
      SELECT
        COUNT(*) as total_transactions,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_transactions,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_transactions,
        COUNT(*) FILTER (WHERE status = 'FAILED') as failed_transactions,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN CAST(amount AS DECIMAL) ELSE 0 END), 0) as total_amount
      FROM transactions
    `;

    const result = await pool.query(query);

    return {
      totalTransactions: parseInt(result.rows[0].total_transactions),
      completedTransactions: parseInt(result.rows[0].completed_transactions),
      pendingTransactions: parseInt(result.rows[0].pending_transactions),
      failedTransactions: parseInt(result.rows[0].failed_transactions),
      totalAmount: result.rows[0].total_amount,
    };
  }

  async getServices(options: ServicePaginationOptions): Promise<PaginatedResult<Service>> {
    const pool = await getPool();

    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (options.providerId) {
      whereClause += ` AND agent_id = $${paramIndex}`;
      queryParams.push(options.providerId);
      paramIndex++;
    }

    if (options.serviceType) {
      whereClause += ` AND service_type = $${paramIndex}`;
      queryParams.push(options.serviceType);
      paramIndex++;
    }

    // 获取总数
    const countQuery = `SELECT COUNT(*) FROM services ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // 获取分页数据
    const offset = (options.page - 1) * options.limit;
    const dataQuery = `
      SELECT * FROM services
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(options.limit, offset);

    const dataResult = await pool.query(dataQuery, queryParams);
    const services = dataResult.rows.map(this.mapDbToService);

    return {
      services,
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  async getServiceById(id: number): Promise<Service | null> {
    const pool = await getPool();

    const query = 'SELECT * FROM services WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbToService(result.rows[0]);
  }

  private mapDbToTransaction(row: any): Transaction {
    return {
      id: row.id,
      transactionHash: row.transaction_hash,
      fromAgentId: row.from_agent_id,
      toAgentId: row.to_agent_id,
      serviceId: row.service_id,
      amount: row.amount,
      serviceType: row.service_type,
      status: row.status,
      platformFee: row.platform_fee,
      chainTxHash: row.chain_tx_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapDbToService(row: any): Service {
    return {
      id: row.id,
      agentId: row.agent_id,
      serviceType: row.service_type,
      pricePerUnit: row.price_per_unit,
      pricingType: row.pricing_type,
      isAvailable: row.is_available,
      kpiHash: row.kpi_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
