import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { initDatabase } from './config/database-mock';
import { initDatabase as initDb } from './config/database';

// Controllers
import { AgentController } from './controllers/agent-mock.controller';
import { SettlementController } from './controllers/settlement.controller';
import { SubscriptionController } from './controllers/subscription.controller';

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
    uptime: process.uptime(),
    mode: process.env.USE_MOCK_DB === 'true' ? 'mock' : 'production',
  });
});

// Mock 数据端点
app.get('/api/v1/mock/data', (req, res) => {
  const { mockData } = require('./config/database-mock');
  res.json({
    success: true,
    data: mockData,
  });
});

// 创建控制器实例
const agentController = new AgentController();
const settlementController = new SettlementController();
const subscriptionController = new SubscriptionController();

// 智能体路由
app.get(`${API_PREFIX}/agents`, agentController.getAll);
app.get(`${API_PREFIX}/agents/:id`, agentController.getById);
app.get(`${API_PREFIX}/agents/wallet/:walletAddress`, agentController.getByWalletAddress);
app.post(`${API_PREFIX}/agents/register`, agentController.register);
app.put(`${API_PREFIX}/agents/:id`, agentController.update);
app.post(`${API_PREFIX}/agents/:id/activate`, agentController.activate);
app.post(`${API_PREFIX}/agents/:id/deactivate`, agentController.deactivate);
app.post(`${API_PREFIX}/agents/:id/deposit`, agentController.deposit);
app.post(`${API_PREFIX}/agents/:id/withdraw`, agentController.withdraw);
app.get(`${API_PREFIX}/agents/:id/balance`, agentController.getBalance);

// 结算路由
app.post(`${API_PREFIX}/settlements/initiate`, settlementController.initiate);
app.post(`${API_PREFIX}/settlements/verify`, settlementController.verifyAndSettle);
app.get(`${API_PREFIX}/settlements/:id`, settlementController.getById);
app.get(`${API_PREFIX}/settlements/agent/:agentId`, settlementController.getByAgent);
app.get(`${API_PREFIX}/settlements/statistics`, settlementController.getStatistics);
app.get(`${API_PREFIX}/settlements/services`, settlementController.getServices);
app.get(`${API_PREFIX}/settlements/services/:id`, settlementController.getServiceById);

// 订阅路由
app.post(`${API_PREFIX}/subscriptions/create`, subscriptionController.create);
app.get(`${API_PREFIX}/subscriptions/:id`, subscriptionController.getById);
app.get(`${API_PREFIX}/subscriptions/subscriber/:subscriberId`, subscriptionController.getBySubscriber);
app.get(`${API_PREFIX}/subscriptions/provider/:providerId`, subscriptionController.getByProvider);
app.put(`${API_PREFIX}/subscriptions/:id`, subscriptionController.update);
app.post(`${API_PREFIX}/subscriptions/:id/cancel`, subscriptionController.cancel);
app.post(`${API_PREFIX}/subscriptions/:id/payment`, subscriptionController.processPayment);
app.get(`${API_PREFIX}/subscriptions/statistics`, subscriptionController.getStatistics);

// 错误处理
app.use(errorHandler);

// 启动服务器
async function startServer() {
  try {
    // 根据环境变量决定使用哪种数据库
    if (process.env.USE_MOCK_DB === 'true') {
      await initDatabase();
      logger.info('Mock database initialized successfully');
    } else {
      await initDb();
      logger.info('PostgreSQL database connected successfully');
    }

    // 启动HTTP服务器
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`API available at http://localhost:${PORT}${API_PREFIX}`);
      logger.info(`Health check at http://localhost:${PORT}/health`);
      logger.info(`Mode: ${process.env.USE_MOCK_DB === 'true' ? 'MOCK' : 'PRODUCTION'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
