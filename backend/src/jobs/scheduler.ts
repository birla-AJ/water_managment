import { logger } from '../config/logger';
import { orderService } from '../modules/order/order.service';
import { billingService } from '../modules/billing/billing.service';
import { env } from '../config/env';

const ONE_HOUR = 60 * 60 * 1000;

/**
 * Lightweight in-process scheduler. For production scale, replace with a
 * dedicated cron worker (node-cron / BullMQ) — the service functions are
 * idempotent so they can be triggered by an external scheduler too.
 */
export function startSchedulers(): void {
  if (process.env.DISABLE_SCHEDULERS === 'true') {
    logger.info('Schedulers disabled via DISABLE_SCHEDULERS');
    return;
  }

  // Generate today's regular orders shortly after boot, then hourly guard.
  const runDailyOrders = async () => {
    try {
      const result = await orderService.generateRegularOrdersForDate(new Date());
      if (result.created > 0) logger.info(`🗓️  Generated ${result.created} regular orders`);
    } catch (err) {
      logger.error(`Order generation failed: ${(err as Error).message}`);
    }
  };

  setTimeout(runDailyOrders, 5_000);
  setInterval(runDailyOrders, ONE_HOUR);

  // Flag overdue invoices and remind customers (each invoice is reminded once).
  const runDueReminders = async () => {
    try {
      const n = await billingService.sendDueReminders();
      if (n > 0) logger.info(`💸 Sent ${n} overdue payment reminder(s)`);
    } catch (err) {
      logger.error(`Due-reminder job failed: ${(err as Error).message}`);
    }
  };

  setTimeout(runDueReminders, 10_000);
  setInterval(runDueReminders, ONE_HOUR);

  logger.info(`⏱️  Schedulers started (inventory low threshold = ${env.inventory.lowThreshold})`);
}
