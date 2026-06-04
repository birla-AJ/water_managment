import { InventoryAction, NotificationAudience, NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { ApiError } from '../../utils/apiError';
import { notificationService } from '../notification/notification.service';

const INV_ID = 'default';

class InventoryService {
  async get() {
    let inv = await prisma.inventory.findUnique({ where: { id: INV_ID } });
    if (!inv) inv = await prisma.inventory.create({ data: { id: INV_ID } });
    return inv;
  }

  async logs(params: { skip: number; take: number; action?: InventoryAction }) {
    const where = params.action ? { action: params.action } : {};
    const [items, total] = await Promise.all([
      prisma.inventoryLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
        include: { admin: { select: { id: true, name: true } } },
      }),
      prisma.inventoryLog.count({ where }),
    ]);
    return { items, total };
  }

  /**
   * Apply a stock movement and write a log atomically. The delta map controls
   * how each counter changes for the given action.
   */
  async adjust(action: InventoryAction, quantity: number, adminId?: string, remarks?: string) {
    if (quantity <= 0) throw ApiError.badRequest('Quantity must be positive');

    const deltas: Record<InventoryAction, Partial<Record<keyof Prisma.InventoryUpdateInput, number>>> = {
      STOCK_IN: { totalCampers: quantity, emptyCampers: quantity },
      FILLED: { emptyCampers: -quantity, filledCampers: quantity },
      EMPTIED: { filledCampers: -quantity, emptyCampers: quantity },
      ALLOCATED: { filledCampers: -quantity, allocatedCampers: quantity },
      RETURNED: { allocatedCampers: -quantity, emptyCampers: quantity, returnedCampers: quantity },
      DAMAGED: { damagedCampers: quantity, totalCampers: -quantity },
      LOST: { lostCampers: quantity, totalCampers: -quantity },
      ADJUSTMENT: { totalCampers: quantity },
    };

    const delta = deltas[action];
    const updateData: Prisma.InventoryUpdateInput = {};
    for (const [key, val] of Object.entries(delta)) {
      (updateData as Record<string, unknown>)[key] = { increment: val };
    }

    const [inv] = await prisma.$transaction([
      prisma.inventory.update({ where: { id: INV_ID }, data: updateData }),
      prisma.inventoryLog.create({ data: { action, quantity, adminId, remarks } }),
    ]);

    await this.checkLowStock(inv.filledCampers);
    return inv;
  }

  private async checkLowStock(filled: number) {
    if (filled <= env.inventory.lowThreshold) {
      await notificationService.notify({
        audience: NotificationAudience.ADMIN,
        type: NotificationType.INVENTORY_LOW,
        title: 'Low inventory alert',
        body: `Only ${filled} filled campers remaining (threshold ${env.inventory.lowThreshold}).`,
      });
    }
  }
}

export const inventoryService = new InventoryService();
