import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './errorHandler';

export const validateBody = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    next();
  };
};

// 常用验证规则
export const validationRules = {
  agent: {
    register: Joi.object({
      walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
      ownerAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
      name: Joi.string().min(1).max(255).required(),
      type: Joi.string()
        .valid('MARKETING', 'SUPPLY_CHAIN', 'CONTENT', 'COMPUTE', 'ANALYTICS', 'CUSTOM')
        .required(),
      metadataUri: Joi.string().uri().optional(),
    }),
    
    update: Joi.object({
      metadataUri: Joi.string().uri().optional(),
    }),
  },

  settlement: {
    initiate: Joi.object({
      toAgent: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
      serviceId: Joi.number().integer().positive().required(),
      units: Joi.number().integer().positive().required(),
      serviceType: Joi.string().required(),
      transactionHash: Joi.string().min(1).required(),
    }),

    verify: Joi.object({
      transactionId: Joi.number().integer().positive().required(),
      kpiData: Joi.string().required(),
      verified: Joi.boolean().required(),
    }),
  },

  subscription: {
    create: Joi.object({
      provider: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
      serviceId: Joi.number().integer().positive().required(),
      amount: Joi.string().pattern(/^\d+(\.\d{1,18})?$/).required(),
      billingCycle: Joi.number().integer().positive().required(),
    }),

    update: Joi.object({
      newAmount: Joi.string().pattern(/^\d+(\.\d{1,18})?$/).optional(),
      newBillingCycle: Joi.number().integer().positive().optional(),
    }),
  },

  service: {
    register: Joi.object({
      serviceType: Joi.string().min(1).max(255).required(),
      pricePerUnit: Joi.string().pattern(/^\d+(\.\d{1,18})?$/).required(),
      pricingType: Joi.string()
        .valid('FIXED', 'PER_UNIT', 'PERFORMANCE_BASED', 'SUBSCRIPTION')
        .required(),
      kpiHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).optional(),
    }),

    updatePrice: Joi.object({
      newPrice: Joi.string().pattern(/^\d+(\.\d{1,18})?$/).required(),
    }),
  },

  kpi: {
    createMetric: Joi.object({
      name: Joi.string().min(1).max(255).required(),
      description: Joi.string().optional(),
      type: Joi.string()
        .valid('COUNTER', 'PERCENTAGE', 'RATING', 'BOOLEAN', 'CURRENCY')
        .required(),
      targetValue: Joi.string().pattern(/^\d+(\.\d{1,18})?$/).required(),
      minValue: Joi.string().pattern(/^\d+(\.\d{1,18})?$/).optional(),
      maxValue: Joi.string().pattern(/^\d+(\.\d{1,18})?$/).optional(),
    }),

    createRule: Joi.object({
      name: Joi.string().min(1).max(255).required(),
      description: Joi.string().optional(),
      metricIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
      operator: Joi.string()
        .valid('GREATER_THAN', 'LESS_THAN', 'EQUAL_TO', 'GREATER_OR_EQUAL', 'LESS_OR_EQUAL')
        .required(),
      threshold: Joi.string().pattern(/^\d+(\.\d{1,18})?$/).required(),
      weight: Joi.number().integer().min(1).max(100).required(),
    }),

    submitReport: Joi.object({
      agentId: Joi.number().integer().positive().required(),
      ruleId: Joi.number().integer().positive().required(),
      metricValues: Joi.array().items(Joi.string().pattern(/^\d+(\.\d{1,18})?$/)).min(1).required(),
    }),
  },
};
