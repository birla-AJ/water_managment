import { InventoryAction, NotificationAudience, NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { ApiError } from '../../utils/apiError';
import { notificationService } from '../notification/notification.service';

class InventoryService {
  async get(adminId?: string) {
    // Legacy inventory is reserved for super-admin. Every regular admin gets a
    // lazily-created, independent stock record keyed by their admin id.
    const where = adminId ? { adminId } : { id: 'default' };
    let inv = await prisma.inventory.findUnique({ where });
    if (!inv) inv = await prisma.inventory.create({ data: adminId ? { id: adminId, adminId } : { id: 'default' } });
    return inv;
  }

  async logs(params: { skip: number; take: number; action?: InventoryAction; adminId?: string }) {
    const where = { ...(params.action ? { action: params.action } : {}), ...(params.adminId ? { adminId: params.adminId } : {}) };
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

    const inventory = await this.get(adminId);
    const [inv] = await prisma.$transaction([
      prisma.inventory.update({ where: { id: inventory.id }, data: updateData }),
      prisma.inventoryLog.create({ data: { action, quantity, adminId, remarks } }),
    ]);

    await this.checkLowStock(inv.filledCampers, adminId);
    return inv;
  }

  private async checkLowStock(filled: number, adminId?: string) {
    if (filled <= env.inventory.lowThreshold) {
      await notificationService.notify({
        audience: NotificationAudience.ADMIN,
        type: NotificationType.INVENTORY_LOW,
        title: 'Low inventory alert',
        body: `Only ${filled} filled campers remaining (threshold ${env.inventory.lowThreshold}).`,
        adminId,
      });
    }
  }
}

export const inventoryService = new InventoryService();
