import { Router } from 'express';

import authRoutes from './modules/auth/auth.routes';
import customerRoutes from './modules/customer/customer.routes';
import customerMeRoutes from './modules/customer/me.routes';
import orderRoutes from './modules/order/order.routes';
import orderMeRoutes from './modules/order/order.me.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import { billingRouter, billingMeRouter } from './modules/billing/billing.routes';
import { paymentRouter, paymentMeRouter } from './modules/payment/payment.routes';
import { deliveryRouter, deliveryMeRouter } from './modules/delivery/delivery.routes';
import notificationRoutes from './modules/notification/notification.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import reportRoutes from './modules/report/report.routes';
import settingsRoutes from './modules/settings/settings.routes';
import vehicleRoutes from './modules/vehicle/vehicle.routes';
import driverRoutes from './modules/driver/driver.routes';
import driverMeRoutes from './modules/driver/driver.me.routes';
import adminRoutes from './modules/admin/admin.routes';

export const apiRouter = Router();

// ---- Shared / auth ----
apiRouter.use('/auth', authRoutes);
apiRouter.use('/notifications', notificationRoutes);

// ---- Admin-facing ----
apiRouter.use('/customers', customerRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/billing', billingRouter);
apiRouter.use('/payments', paymentRouter);
apiRouter.use('/deliveries', deliveryRouter);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/vehicles', vehicleRoutes);
apiRouter.use('/drivers', driverRoutes);
apiRouter.use('/admins', adminRoutes);

// ---- Customer-facing (mobile app) ----
apiRouter.use('/me', customerMeRoutes);
apiRouter.use('/me/orders', orderMeRoutes);
apiRouter.use('/me/billing', billingMeRouter);
apiRouter.use('/me/payments', paymentMeRouter);
apiRouter.use('/me/deliveries', deliveryMeRouter);

// ---- Driver-facing (mobile app) ----
apiRouter.use('/driver', driverMeRoutes);
