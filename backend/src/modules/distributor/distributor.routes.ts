import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import * as ctrl from './distributor.controller';

const router = Router();
// Customer-facing: a logged-in customer (post-OTP) discovers distributors that
// serve their location while completing registration / updating their profile.
const customer = authenticate('customer');

router.get('/suggest', customer, ctrl.suggest);
router.get('/', customer, ctrl.listAll);

export default router;
