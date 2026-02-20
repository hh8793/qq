import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { validateBody, validationRules } from '../middleware/validator';

const router = Router();
const subscriptionController = new SubscriptionController();

// 创建订阅
router.post(
  '/create',
  validateBody(validationRules.subscription.create),
  subscriptionController.create
);

// 获取订阅详情
router.get('/:id', subscriptionController.getById);

// 获取订阅者的订阅列表
router.get('/subscriber/:subscriberId', subscriptionController.getBySubscriber);

// 获取提供者的订阅列表
router.get('/provider/:providerId', subscriptionController.getByProvider);

// 更新订阅
router.put(
  '/:id',
  validateBody(validationRules.subscription.update),
  subscriptionController.update
);

// 取消订阅
router.post('/:id/cancel', subscriptionController.cancel);

// 处理支付
router.post('/:id/payment', subscriptionController.processPayment);

// 获取统计信息
router.get('/statistics', subscriptionController.getStatistics);

export default router;
