import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { aiChatSchema } from './ai.dto';
import * as ctrl from './ai.controller';

export const aiAdminRouter = Router();
aiAdminRouter.get('/suggestions', authenticate('admin'), ctrl.adminSuggestions);
aiAdminRouter.get('/usage', authenticate('admin'), ctrl.adminUsage);
aiAdminRouter.post('/chat', authenticate('admin'), validate(aiChatSchema), ctrl.askAdmin);

export const aiCustomerRouter = Router();
aiCustomerRouter.get('/usage', authenticate('customer'), ctrl.customerUsage);
aiCustomerRouter.post('/chat', authenticate('customer'), validate(aiChatSchema), ctrl.askCustomer);
