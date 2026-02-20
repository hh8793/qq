import { getPool } from '../config/database';
import { logger } from '../utils/logger';

export interface Subscription {
  id?: number;
  subscriberAgentId: number;
  providerAgentId: number;
  serviceId: number;
  amount: string;
  billingCycle: number; // 秒
  nextBillingDate: Date;
  isActive?: boolean;
  chainSubscriptionId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaymentRecord {
  id?: number;
  subscriptionId: number;
  transactionId?: number;
  amount: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  processedAt?: Date;
  createdAt?: Date;
}

export interface SubscriptionPaginationOptions {
  page: number;
  limit: number;
  isActive?: boolean;
}

export interface PaginatedResult<T> {
  subscriptions: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class SubscriptionService {
  async createSubscription(data: Omit<Subscription, 'id' | 'isActive' | 'chainSubscriptionId' | 'createdAt' | 'updatedAt'>): Promise<Subscription> {
    const pool = await getPool();

    const query = `
      INSERT INTO subscriptions (
        subscriber_agent_id, provider_agent_id, service_id, amount, 
        billing_cycle, next_billing_date, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *
    `;

    const nextBillingDate = new Date(Date.now() + data.billingCycle * 1000);

    const values = [
      data.subscriberAgentId,
      data.providerAgentId,
      data.serviceId,
      data.amount,
      data.billingCycle,
      nextBillingDate,
    ];

    try {
      const result = await pool.query(query, values);
      logger.info(`Subscription created: ${result.rows[0].id}`);
      
      // 记录首次支付
      await this.recordPayment({
        subscriptionId: result.rows[0].id,
        amount: data.amount,
        status: 'SUCCESS',
      });
      
      return this.mapDbToSubscription(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create subscription:', error);
      throw error;
    }
  }

  async getSubscriptionById(id: number): Promise<Subscription | null> {
    const pool = await getPool();

    const query = 'SELECT * FROM subscriptions WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbToSubscription(result.rows[0]);
  }

  async getSubscriptionsBySubscriber(options: SubscriptionPaginationOptions & { subscriberAgentId: number }): Promise<PaginatedResult<Subscription>> {
    const pool = await getPool();

    let whereClause = 'WHERE subscriber_agent_id = $1';
    const queryParams: any[] = [options.subscriberAgentId];
    let paramIndex = 2;

    if (options.isActive !== undefined) {
      whereClause += ` AND is_active = $${paramIndex}`;
      queryParams.push(options.isActive);
      paramIndex++;
    }

    // 获取总数
    const countQuery = `SELECT COUNT(*) FROM subscriptions ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // 获取分页数据
    const offset = (options.page - 1) * options.limit;
    const dataQuery = `
      SELECT * FROM subscriptions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(options.limit, offset);

    const dataResult = await pool.query(dataQuery, queryParams);
    const subscriptions = dataResult.rows.map(this.mapDbToSubscription);

    return {
      subscriptions,
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  async getSubscriptionsByProvider(options: SubscriptionPaginationOptions & { providerAgentId: number }): Promise<PaginatedResult<Subscription>> {
    const pool = await getPool();

    let whereClause = 'WHERE provider_agent_id = $1';
    const queryParams: any[] = [options.providerAgentId];
    let paramIndex = 2;

    if (options.isActive !== undefined) {
      whereClause += ` AND is_active = $${paramIndex}`;
      queryParams.push(options.isActive);
      paramIndex++;
    }

    // 获取总数
    const countQuery = `SELECT COUNT(*) FROM subscriptions ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // 获取分页数据
    const offset = (options.page - 1) * options.limit;
    const dataQuery = `
      SELECT * FROM subscriptions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(options.limit, offset);

    const dataResult = await pool.query(dataQuery, queryParams);
    const subscriptions = dataResult.rows.map(this.mapDbToSubscription);

    return {
      subscriptions,
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  async updateSubscription(id: number, data: Partial<Pick<Subscription, 'amount' | 'billingCycle'>>): Promise<Subscription | null> {
    const pool = await getPool();

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.amount !== undefined) {
      updateFields.push(`amount = $${paramIndex}`);
      values.push(data.amount);
      paramIndex++;
    }

    if (data.billingCycle !== undefined) {
      updateFields.push(`billing_cycle = $${paramIndex}`);
      values.push(data.billingCycle);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE subscriptions
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`Subscription updated: ${id}`);
    return this.mapDbToSubscription(result.rows[0]);
  }

  async cancelSubscription(id: number): Promise<Subscription | null> {
    const pool = await getPool();

    const query = `
      UPDATE subscriptions
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`Subscription cancelled: ${id}`);
    return this.mapDbToSubscription(result.rows[0]);
  }

  async processPayment(id: number): Promise<Subscription | null> {
    const pool = await getPool();

    // 获取订阅信息
    const subscription = await this.getSubscriptionById(id);
    if (!subscription) {
      return null;
    }

    if (!subscription.isActive) {
      throw new Error('Subscription is not active');
    }

    const now = new Date();
    if (now < subscription.nextBillingDate) {
      throw new Error('Payment not due yet');
    }

    // 记录支付
    await this.recordPayment({
      subscriptionId: id,
      amount: subscription.amount,
      status: 'SUCCESS',
    });

    // 更新下一计费日期
    const query = `
      UPDATE subscriptions
      SET next_billing_date = CURRENT_TIMESTAMP + (billing_cycle || ' seconds')::interval,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);

    logger.info(`Payment processed for subscription: ${id}`);
    return this.mapDbToSubscription(result.rows[0]);
  }

  async getStatistics(): Promise<any> {
    const pool = await getPool();

    const query = `
      SELECT
        COUNT(*) as total_subscriptions,
        COUNT(*) FILTER (WHERE is_active = true) as active_subscriptions,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_subscriptions,
        COALESCE(SUM(CASE WHEN is_active = true THEN CAST(amount AS DECIMAL) ELSE 0 END), 0) as monthly_recurring_revenue
      FROM subscriptions
    `;

    const result = await pool.query(query);

    return {
      totalSubscriptions: parseInt(result.rows[0].total_subscriptions),
      activeSubscriptions: parseInt(result.rows[0].active_subscriptions),
      inactiveSubscriptions: parseInt(result.rows[0].inactive_subscriptions),
      monthlyRecurringRevenue: result.rows[0].monthly_recurring_revenue,
    };
  }

  private async recordPayment(data: Omit<PaymentRecord, 'id' | 'transactionId' | 'processedAt' | 'createdAt'>): Promise<PaymentRecord> {
    const pool = await getPool();

    const query = `
      INSERT INTO payment_records (subscription_id, amount, status, processed_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [data.subscriptionId, data.amount, data.status];

    const result = await pool.query(query, values);
    return this.mapDbToPaymentRecord(result.rows[0]);
  }

  private mapDbToSubscription(row: any): Subscription {
    return {
      id: row.id,
      subscriberAgentId: row.subscriber_agent_id,
      providerAgentId: row.provider_agent_id,
      serviceId: row.service_id,
      amount: row.amount,
      billingCycle: row.billing_cycle,
      nextBillingDate: row.next_billing_date,
      isActive: row.is_active,
      chainSubscriptionId: row.chain_subscription_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapDbToPaymentRecord(row: any): PaymentRecord {
    return {
      id: row.id,
      subscriptionId: row.subscription_id,
      transactionId: row.transaction_id,
      amount: row.amount,
      status: row.status,
      processedAt: row.processed_at,
      createdAt: row.created_at,
    };
  }
}
