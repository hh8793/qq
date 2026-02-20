export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'agentlink',
    user: process.env.DB_USER || 'agentlink_user',
    password: process.env.DB_PASSWORD || 'agentlink_password',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  blockchain: {
    network: process.env.ETH_NETWORK || 'goerli',
    rpcUrl: process.env.ETH_RPC_URL || '',
    privateKey: process.env.ETH_PRIVATE_KEY || '',
    contractAddress: process.env.ETH_CONTRACT_ADDRESS || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  webhook: {
    secretKey: process.env.WEBHOOK_SECRET_KEY || '',
    maxRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES || '3', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
  },
};
