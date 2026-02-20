import { Router } from 'express';
import { SettlementController } from '../controllers/settlement.controller';
import { validateBody, validationRules } from '../middleware/validator';

const router = Router();
const settlementController = new SettlementController();

// 发起结算
router.post(
  '/initiate',
  validateBody(validationRules.settlement.initiate),
  settlementController.initiate
);

// 验证并结算
router.post(
  '/verify',
  validateBody(validationRules.settlement.verify),
  settlementController.verifyAndSettle
);

// 获取交易详情
router.get('/:id', settlementController.getById);

// 获取智能体的交易列表
router.get('/agent/:agentId', settlementController.getByAgent);

// 获取统计信息
router.get('/statistics', settlementController.getStatistics);

// 获取服务列表
router.get('/services', settlementController.getServices);

// 获取服务详情
router.get('/services/:id', settlementController.getServiceById);

export default router;
