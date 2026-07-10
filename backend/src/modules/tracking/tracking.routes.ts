import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as ctrl from './tracking.controller';
import { dutySchema, locationSchema, polygonSchema, updatePolygonSchema } from './tracking.dto';

export const trackingRouter = Router();
const admin = authenticate('admin');

trackingRouter.get('/admin/live', admin, ctrl.adminLive);
trackingRouter.post('/polygons', admin, validate(polygonSchema), ctrl.createPolygon);
trackingRouter.put('/polygons/:id', admin, validate(updatePolygonSchema), ctrl.updatePolygon);
trackingRouter.delete('/polygons/:id', admin, ctrl.deletePolygon);

export const trackingDriverRouter = Router();
const driver = authenticate('driver');

trackingDriverRouter.get('/duty', driver, ctrl.dutyStatus);
trackingDriverRouter.post('/duty', driver, validate(dutySchema), ctrl.setDuty);
trackingDriverRouter.post('/location', driver, validate(locationSchema), ctrl.updateLocation);

export const trackingCustomerRouter = Router();
const customer = authenticate('customer');

trackingCustomerRouter.get('/active-delivery', customer, ctrl.customerActive);
