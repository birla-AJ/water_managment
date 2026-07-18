import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { CreateVehicleDto, UpdateVehicleDto } from './vehicle.dto';

class VehicleService {
  async list(query: { skip: number; take: number; search?: string; isActive?: boolean; adminId?: string }) {
    const where: Prisma.VehicleWhereInput = {
      ...(query.adminId ? { adminId: query.adminId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { number: { contains: query.search, mode: 'insensitive' } },
              { type: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
        include: { driver: { select: { id: true, name: true, mobile: true } } },
      }),
      prisma.vehicle.count({ where }),
    ]);
    return { items, total };
  }

  /** Vehicles not currently assigned to any driver (for assignment dropdowns). */
  async available(adminId?: string) {
    return prisma.vehicle.findMany({
      where: { isActive: true, driver: null, ...(adminId ? { adminId } : {}) },
      orderBy: { number: 'asc' },
    });
  }

  async getById(id: string, adminId?: string) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: { driver: { select: { id: true, name: true, mobile: true } } },
    });
    if (!vehicle || (adminId && vehicle.adminId !== adminId)) throw ApiError.notFound('Vehicle not found');
    return vehicle;
  }

  async create(dto: CreateVehicleDto, adminId?: string) {
    const existing = await prisma.vehicle.findUnique({ where: { number: dto.number } });
    if (existing) throw ApiError.conflict('A vehicle with this number already exists');
    return prisma.vehicle.create({ data: { ...dto, ...(adminId ? { adminId } : {}) } });
  }

  async update(id: string, dto: UpdateVehicleDto, adminId?: string) {
    await this.getById(id, adminId);
    if (dto.number) {
      const dup = await prisma.vehicle.findUnique({ where: { number: dto.number } });
      if (dup && dup.id !== id) throw ApiError.conflict('A vehicle with this number already exists');
    }
    return prisma.vehicle.update({ where: { id }, data: dto });
  }

  async remove(id: string, adminId?: string) {
    await this.getById(id, adminId);
    // Unassign from any driver first (vehicleId is SetNull on delete, but be explicit).
    await prisma.driver.updateMany({ where: { vehicleId: id }, data: { vehicleId: null } });
    await prisma.vehicle.delete({ where: { id } });
    return { id };
  }
}

export const vehicleService = new VehicleService();
