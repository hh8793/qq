import { Request, Response } from 'express';
import { SubscriptionService } from '../services/subscription.service';
import { logger } from '../utils/logger';
import { asyncHandler, AppError } from '../middleware/errorHandler';

export class SubscriptionController {
  private subscriptionService: SubscriptionService;

  constructor() {
    this.subscriptionService = new SubscriptionService();
  }

  create = asyncHandler(async (req: Request, res: Response) => {
    const { provider, serviceId, amount, billingCycle } = req.body;
    const subscriber = req.user?.agentId;

    const subscription = await this.subscriptionService.createSubscription({
      subscriberAgentId: subscriber as number,
      providerAgentId: provider,
      serviceId,
      amount,
      billingCycle,
    });

    logger.info(`Subscription created: ${subscription.id}`);

    res.status(201).json({
      success: true,
      data: subscription,
    });
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const subscription = await this.subscriptionService.getSubscriptionById(parseInt(id));

    if (!subscription) {
      throw new AppError(404, 'Subscription not found');
    }

    res.json({
      success: true,
      data: subscription,
    });
  });

  getBySubscriber = asyncHandler(async (req: Request, res: Response) => {
    const { subscriberId } = req.params;
    const { page = '1', limit = '10', isActive } = req.query;

    const result = await this.subscriptionService.getSubscriptionsBySubscriber({
      subscriberAgentId: parseInt(subscriberId),
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });

    res.json({
      success: true,
      data: result.subscriptions,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  getByProvider = asyncHandler(async (req: Request, res: Response) => {
    const { providerId } = req.params;
    const { page = '1', limit = '10', isActive } = req.query;

    const result = await this.subscriptionService.getSubscriptionsByProvider({
      providerAgentId: parseInt(providerId),
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });

    res.json({
      success: true,
      data: result.subscriptions,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { newAmount, newBillingCycle } = req.body;

    const subscription = await this.subscriptionService.updateSubscription(parseInt(id), {
      newAmount,
      newBillingCycle,
    });

    if (!subscription) {
      throw new AppError(404, 'Subscription not found');
    }

    logger.info(`Subscription updated: ${id}`);

    res.json({
      success: true,
      data: subscription,
    });
  });

  cancel = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const subscription = await this.subscriptionService.cancelSubscription(parseInt(id));

    if (!subscription) {
      throw new AppError(404, 'Subscription not found');
    }

    logger.info(`Subscription cancelled: ${id}`);

    res.json({
      success: true,
      data: subscription,
    });
  });

  processPayment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const subscription = await this.subscriptionService.processPayment(parseInt(id));

    if (!subscription) {
      throw new AppError(404, 'Subscription not found');
    }

    logger.info(`Payment processed for subscription: ${id}`);

    res.json({
      success: true,
      data: subscription,
    });
  });

  getStatistics = asyncHandler(async (req: Request, res: Response) => {
    const statistics = await this.subscriptionService.getStatistics();

    res.json({
      success: true,
      data: statistics,
    });
  });
}
