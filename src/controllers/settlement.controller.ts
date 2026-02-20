import { Request, Response } from 'express';
import { SettlementService } from '../services/settlement.service';
import { logger } from '../utils/logger';
import { asyncHandler, AppError } from '../middleware/errorHandler';

export class SettlementController {
  private settlementService: SettlementService;

  constructor() {
    this.settlementService = new SettlementService();
  }

  initiate = asyncHandler(async (req: Request, res: Response) => {
    const { toAgent, serviceId, units, serviceType, transactionHash } = req.body;
    const fromAgent = req.user?.agentId; // 从认证中间件获取

    const transaction = await this.settlementService.initiateSettlement({
      fromAgent: fromAgent as number,
      toAgent: toAgent,
      serviceId,
      units,
      serviceType,
      transactionHash,
    });

    logger.info(`Settlement initiated: ${transaction.id}`);

    res.status(201).json({
      success: true,
      data: transaction,
    });
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const transaction = await this.settlementService.getTransactionById(parseInt(id));

    if (!transaction) {
      throw new AppError(404, 'Transaction not found');
    }

    res.json({
      success: true,
      data: transaction,
    });
  });

  getByAgent = asyncHandler(async (req: Request, res: Response) => {
    const { agentId } = req.params;
    const { page = '1', limit = '10', status } = req.query;

    const result = await this.settlementService.getTransactionsByAgent({
      agentId: parseInt(agentId),
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      status: status as string,
    });

    res.json({
      success: true,
      data: result.transactions,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  verifyAndSettle = asyncHandler(async (req: Request, res: Response) => {
    const { transactionId, kpiData, verified } = req.body;

    const transaction = await this.settlementService.verifyAndSettle({
      transactionId,
      kpiData,
      verified,
    });

    logger.info(`Transaction verified and settled: ${transactionId}`);

    res.json({
      success: true,
      data: transaction,
    });
  });

  getStatistics = asyncHandler(async (req: Request, res: Response) => {
    const statistics = await this.settlementService.getStatistics();

    res.json({
      success: true,
      data: statistics,
    });
  });

  getServices = asyncHandler(async (req: Request, res: Response) => {
    const { providerId, serviceType, page = '1', limit = '10' } = req.query;

    const result = await this.settlementService.getServices({
      providerId: providerId ? parseInt(providerId as string) : undefined,
      serviceType: serviceType as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.json({
      success: true,
      data: result.services,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  getServiceById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const service = await this.settlementService.getServiceById(parseInt(id));

    if (!service) {
      throw new AppError(404, 'Service not found');
    }

    res.json({
      success: true,
      data: service,
    });
  });
}
