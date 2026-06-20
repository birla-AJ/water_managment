import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { CreateServiceAreaDto, UpdateServiceAreaDto } from './servicearea.dto';

const select = {
  id: true,
  name: true,
  city: true,
  pincode: true,
  latitude: true,
  longitude: true,
  _count: { select: { admins: true } },
};

class ServiceAreaService {
  async list() {
    return prisma.serviceArea.findMany({ orderBy: { name: 'asc' }, select });
  }

  async create(dto: CreateServiceAreaDto) {
    const exists = await prisma.serviceArea.findUnique({ where: { name: dto.name } });
    if (exists) throw ApiError.badRequest('A service area with this name already exists');
    return prisma.serviceArea.create({ data: dto, select });
  }

  async update(id: string, dto: UpdateServiceAreaDto) {
    const area = await prisma.serviceArea.findUnique({ where: { id } });
    if (!area) throw ApiError.notFound('Service area not found');
    if (dto.name && dto.name !== area.name) {
      const dup = await prisma.serviceArea.findFirst({ where: { name: dto.name, id: { not: id } } });
      if (dup) throw ApiError.badRequest('A service area with this name already exists');
    }
    return prisma.serviceArea.update({ where: { id }, data: dto, select });
  }

  async remove(id: string) {
    const area = await prisma.serviceArea.findUnique({ where: { id } });
    if (!area) throw ApiError.notFound('Service area not found');
    await prisma.serviceArea.delete({ where: { id } });
    return { success: true };
  }
}

export const serviceAreaService = new ServiceAreaService();
