import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';
import { config } from './index';

let pool: Pool | null = null;

export const poolConfig: PoolConfig = {
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export async function initDatabase(): Promise<void> {
  try {
    pool = new Pool(poolConfig);

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });

    // 测试连接
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    logger.info('Database connection established:', result.rows[0]);
    
    // 运行迁移
    await runMigrations();
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

export async function getPool(): Promise<Pool> {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    logger.info('Database connection closed');
  }
}

async function runMigrations(): Promise<void> {
  const client = await getPool();
  
  try {
    const clientConnection = await client.connect();
    
    // 创建迁移表
    await clientConnection.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建智能体表
    await clientConnection.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(42) UNIQUE NOT NULL,
        owner_address VARCHAR(42) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        metadata_uri TEXT,
        is_active BOOLEAN DEFAULT true,
        reputation_score INTEGER DEFAULT 100,
        balance DECIMAL(20, 8) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建服务表
    await clientConnection.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER REFERENCES agents(id),
        service_type VARCHAR(255) NOT NULL,
        price_per_unit DECIMAL(20, 8) NOT NULL,
        pricing_type VARCHAR(50) NOT NULL,
        is_available BOOLEAN DEFAULT true,
        kpi_hash VARCHAR(66),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建交易表
    await clientConnection.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        transaction_hash VARCHAR(66) UNIQUE NOT NULL,
        from_agent_id INTEGER REFERENCES agents(id),
        to_agent_id INTEGER REFERENCES agents(id),
        service_id INTEGER REFERENCES services(id),
        amount DECIMAL(20, 8) NOT NULL,
        service_type VARCHAR(255),
        status VARCHAR(50) DEFAULT 'PENDING',
        platform_fee DECIMAL(20, 8) DEFAULT 0,
        chain_tx_hash VARCHAR(66),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建订阅表
    await clientConnection.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        subscriber_agent_id INTEGER REFERENCES agents(id),
        provider_agent_id INTEGER REFERENCES agents(id),
        service_id INTEGER REFERENCES services(id),
        amount DECIMAL(20, 8) NOT NULL,
        billing_cycle INTEGER NOT NULL,
        next_billing_date TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT true,
        chain_subscription_id BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建支付记录表
    await clientConnection.query(`
      CREATE TABLE IF NOT EXISTS payment_records (
        id SERIAL PRIMARY KEY,
        subscription_id INTEGER REFERENCES subscriptions(id),
        transaction_id INTEGER REFERENCES transactions(id),
        amount DECIMAL(20, 8) NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建KPI指标表
    await clientConnection.query(`
      CREATE TABLE IF NOT EXISTS kpi_metrics (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        target_value DECIMAL(20, 8) NOT NULL,
        min_value DECIMAL(20, 8),
        max_value DECIMAL(20, 8),
        chain_metric_id BIGINT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建KPI规则表
    await clientConnection.query(`
      CREATE TABLE IF NOT EXISTS kpi_rules (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        operator VARCHAR(50) NOT NULL,
        threshold DECIMAL(20, 8) NOT NULL,
        weight INTEGER NOT NULL,
        chain_rule_id BIGINT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建KPI规则指标关联表
    await clientConnection.query(`
      CREATE TABLE IF NOT EXISTS kpi_rule_metrics (
        id SERIAL PRIMARY KEY,
        rule_id INTEGER REFERENCES kpi_rules(id),
        metric_id INTEGER REFERENCES kpi_metrics(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建KPI报告表
    await clientConnection.query(`
      CREATE TABLE IF NOT EXISTS kpi_reports (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER REFERENCES agents(id),
        rule_id INTEGER REFERENCES kpi_rules(id),
        reporter_address VARCHAR(42) NOT NULL,
        metric_values JSONB NOT NULL,
        score DECIMAL(10, 2),
        is_verified BOOLEAN DEFAULT false,
        chain_report_id BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建索引
    await clientConnection.query(`
      CREATE INDEX IF NOT EXISTS idx_agents_wallet ON agents(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_agents_active ON agents(is_active);
      CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_agent_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_agent_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
      CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(transaction_hash);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(is_active);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_date);
    `);
    
    clientConnection.release();
    
    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Failed to run migrations:', error);
    throw error;
  }
}
