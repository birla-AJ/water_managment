import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as ctrl from './servicearea.controller';
import { createServiceAreaSchema, updateServiceAreaSchema } from './servicearea.dto';

const router = Router();
// Any admin can read the master list (used to populate pickers); only the
// super-admin can mutate it.
const anyAdmin = [authenticate('admin')];
const superAdmin = [authenticate('admin'), authorize('SUPER_ADMIN')];

router.get('/', ...anyAdmin, ctrl.list);
router.post('/', ...superAdmin, validate(createServiceAreaSchema), ctrl.create);
router.put('/:id', ...superAdmin, validate(updateServiceAreaSchema), ctrl.update);
router.delete('/:id', ...superAdmin, ctrl.remove);

export default router;
