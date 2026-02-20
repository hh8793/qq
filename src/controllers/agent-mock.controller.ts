import { Request, Response } from 'express';
import { AgentService } from '../services/agent-mock.service';
import { logger } from '../utils/logger';
import { asyncHandler, AppError } from '../middleware/errorHandler';

export class AgentController {
  private agentService: AgentService;

  constructor() {
    this.agentService = new AgentService();
  }

  register = asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress, ownerAddress, name, type, metadataUri } = req.body;

    const agent = await this.agentService.registerAgent({
      walletAddress,
      ownerAddress,
      name,
      type,
      metadataUri,
    });

    logger.info(`Agent registered: ${walletAddress}`);

    res.status(201).json({
      success: true,
      data: agent,
    });
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const agent = await this.agentService.getAgentById(parseInt(id));

    if (!agent) {
      throw new AppError(404, 'Agent not found');
    }

    res.json({
      success: true,
      data: agent,
    });
  });

  getByWalletAddress = asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress } = req.params;

    const agent = await this.agentService.getAgentByWalletAddress(walletAddress);

    if (!agent) {
      throw new AppError(404, 'Agent not found');
    }

    res.json({
      success: true,
      data: agent,
    });
  });

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const { page = '1', limit = '10', type, isActive } = req.query;

    const result = await this.agentService.getAllAgents({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      type: type as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });

    res.json({
      success: true,
      data: result.agents,
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
    const { metadataUri } = req.body;

    const agent = await this.agentService.updateAgent(parseInt(id), {
      metadataUri,
    });

    if (!agent) {
      throw new AppError(404, 'Agent not found');
    }

    logger.info(`Agent updated: ${id}`);

    res.json({
      success: true,
      data: agent,
    });
  });

  activate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const agent = await this.agentService.activateAgent(parseInt(id));

    if (!agent) {
      throw new AppError(404, 'Agent not found');
    }

    logger.info(`Agent activated: ${id}`);

    res.json({
      success: true,
      data: agent,
    });
  });

  deactivate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const agent = await this.agentService.deactivateAgent(parseInt(id));

    if (!agent) {
      throw new AppError(404, 'Agent not found');
    }

    logger.info(`Agent deactivated: ${id}`);

    res.json({
      success: true,
      data: agent,
    });
  });

  deposit = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { amount } = req.body;

    const result = await this.agentService.deposit(parseInt(id), amount);

    logger.info(`Deposit made to agent ${id}: ${amount}`);

    res.json({
      success: true,
      data: result,
    });
  });

  withdraw = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { amount } = req.body;

    const result = await this.agentService.withdraw(parseInt(id), amount);

    logger.info(`Withdrawal from agent ${id}: ${amount}`);

    res.json({
      success: true,
      data: result,
    });
  });

  getBalance = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const balance = await this.agentService.getBalance(parseInt(id));

    res.json({
      success: true,
      data: { balance },
    });
  });
}
