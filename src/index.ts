import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { initDatabase } from './config/database';
import agentRoutes from './routes/agents';
import settlementRoutes from './routes/settlements';
import subscriptionRoutes from './routes/subscriptions';
import { initializeContracts } from './config/contracts';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API 路由
app.use(`${API_PREFIX}/agents`, agentRoutes);
app.use(`${API_PREFIX}/settlements`, settlementRoutes);
app.use(`${API_PREFIX}/subscriptions`, subscriptionRoutes);

// 错误处理
app.use(errorHandler);

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库
    await initDatabase();
    logger.info('Database connected successfully');

    // 初始化智能合约
    await initializeContracts();
    logger.info('Smart contracts initialized successfully');

    // 启动HTTP服务器
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`API available at http://localhost:${PORT}${API_PREFIX}`);
      logger.info(`Health check at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

export default app;
