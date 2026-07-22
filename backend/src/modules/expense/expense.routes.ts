import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as ctrl from './expense.controller';
import { expenseSchema } from './expense.dto';

const router = Router(); const admin = authenticate('admin');
router.get('/', admin, ctrl.list);
router.get('/export', admin, ctrl.exportExcel);
router.post('/', admin, validate(expenseSchema), ctrl.create);
router.delete('/:id', admin, ctrl.remove);
export default router;
