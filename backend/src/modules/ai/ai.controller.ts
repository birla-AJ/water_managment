import { Request, Response } from 'express';
import { ok } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { aiService } from './ai.service';

export const askAdmin = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await aiService.askAdmin(req.user!, req.body.message, req.body.intent), 'AI answer');
});

export const askCustomer = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await aiService.askCustomer(req.user!.sub, req.body.message, req.body.intent), 'AI answer');
});

export const adminSuggestions = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, aiService.adminSuggestions, 'AI suggestions');
});

export const customerUsage = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await aiService.customerUsage(req.user!.sub), 'AI usage');
});

