import { Router } from 'express';
import { AgentController } from '../controllers/agent.controller';
import { validateBody, validateParams, validationRules } from '../middleware/validator';

const router = Router();
const agentController = new AgentController();

// 注册智能体
router.post(
  '/register',
  validateBody(validationRules.agent.register),
  agentController.register
);

// 获取所有智能体
router.get('/', agentController.getAll);

// 根据钱包地址获取智能体
router.get('/wallet/:walletAddress', agentController.getByWalletAddress);

// 获取智能体详情
router.get('/:id', agentController.getById);

// 更新智能体
router.put(
  '/:id',
  validateBody(validationRules.agent.update),
  agentController.update
);

// 激活智能体
router.post('/:id/activate', agentController.activate);

// 停用智能体
router.post('/:id/deactivate', agentController.deactivate);

// 存款
router.post('/:id/deposit', agentController.deposit);

// 取款
router.post('/:id/withdraw', agentController.withdraw);

// 查询余额
router.get('/:id/balance', agentController.getBalance);

export default router;
