import { Prisma, AdminRole } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { hashPassword } from '../../utils/password';
import { CreateAdminDto, UpdateAdminDto } from './admin.dto';

// Never expose the password hash to clients.
const adminSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  mobile: true,
  avatarUrl: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  // Distributor service definition
  latitude: true,
  longitude: true,
  serviceRadiusKm: true,
  pincodes: true,
  serviceAreas: true,
  areaLinks: { select: { id: true, name: true } },
};

class AdminService {
  async list(query: { skip: number; take: number; search?: string; role?: AdminRole }) {
    const where: Prisma.AdminWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { mobile: { contains: query.search } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.admin.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
        select: { ...adminSelect, _count: { select: { customers: true } } },
      }),
      prisma.admin.count({ where }),
    ]);
    return { items, total };
  }

  /** Customers created/managed by a given admin (for the super-admin view). */
  async customersOf(id: string) {
    const admin = await prisma.admin.findUnique({ where: { id }, select: { id: true } });
    if (!admin) throw ApiError.notFound('Admin not found');
    return prisma.customer.findMany({
      where: { createdById: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, mobile: true, area: true, status: true,
        customerType: true, allocatedCampers: true, isPaused: true, createdAt: true,
      },
    });
  }

  async getById(id: string) {
    const admin = await prisma.admin.findUnique({ where: { id }, select: adminSelect });
    if (!admin) throw ApiError.notFound('Admin not found');
    return admin;
  }

  async create(dto: CreateAdminDto) {
    const existing = await prisma.admin.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw ApiError.badRequest('An admin with this email already exists');
    if (dto.mobile) {
      const byMobile = await prisma.admin.findUnique({ where: { mobile: dto.mobile } });
      if (byMobile) throw ApiError.badRequest('An admin with this mobile already exists');
    }
    const passwordHash = await hashPassword(dto.password);
    return prisma.admin.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role,
        phone: dto.phone,
        mobile: dto.mobile,
        isActive: dto.isActive,
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.serviceRadiusKm !== undefined ? { serviceRadiusKm: dto.serviceRadiusKm } : {}),
        ...(dto.pincodes ? { pincodes: dto.pincodes } : {}),
        ...(dto.serviceAreas ? { serviceAreas: dto.serviceAreas } : {}),
        ...(dto.areaIds?.length ? { areaLinks: { connect: dto.areaIds.map((id) => ({ id })) } } : {}),
      },
      select: adminSelect,
    });
  }

  async update(id: string, dto: UpdateAdminDto) {
    const admin = await prisma.admin.findUnique({ where: { id } });
    if (!admin) throw ApiError.notFound('Admin not found');

    // Guard the last active super admin from being demoted or deactivated.
    if (admin.role === 'SUPER_ADMIN' && (dto.role === 'ADMIN' || dto.isActive === false)) {
      const otherSupers = await prisma.admin.count({ where: { role: 'SUPER_ADMIN', isActive: true, id: { not: id } } });
      if (otherSupers === 0) throw ApiError.badRequest('Cannot demote or deactivate the last active super admin');
    }

    if (dto.mobile) {
      const byMobile = await prisma.admin.findFirst({ where: { mobile: dto.mobile, id: { not: id } } });
      if (byMobile) throw ApiError.badRequest('An admin with this mobile already exists');
    }

    const data: Prisma.AdminUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.role !== undefined ? { role: dto.role } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.mobile !== undefined ? { mobile: dto.mobile } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.password ? { passwordHash: await hashPassword(dto.password) } : {}),
      ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
      ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
      ...(dto.serviceRadiusKm !== undefined ? { serviceRadiusKm: dto.serviceRadiusKm } : {}),
      ...(dto.pincodes !== undefined ? { pincodes: dto.pincodes } : {}),
      ...(dto.serviceAreas !== undefined ? { serviceAreas: dto.serviceAreas } : {}),
      // Replace the linked master-list areas with the supplied set.
      ...(dto.areaIds !== undefined ? { areaLinks: { set: dto.areaIds.map((id) => ({ id })) } } : {}),
    };
    return prisma.admin.update({ where: { id }, data, select: adminSelect });
  }

  async remove(id: string, actorId: string) {
    if (id === actorId) throw ApiError.badRequest('You cannot delete your own account');
    const admin = await prisma.admin.findUnique({ where: { id } });
    if (!admin) throw ApiError.notFound('Admin not found');
    if (admin.role === 'SUPER_ADMIN') {
      const otherSupers = await prisma.admin.count({ where: { role: 'SUPER_ADMIN', isActive: true, id: { not: id } } });
      if (otherSupers === 0) throw ApiError.badRequest('Cannot delete the last active super admin');
    }
    await prisma.admin.delete({ where: { id } });
    return { success: true };
  }
}

export const adminService = new AdminService();
