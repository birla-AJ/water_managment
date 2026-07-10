import dayjs from 'dayjs';
import { OrderStatus, Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { JwtPayload } from '../../utils/jwt';
import { scopedDistributorId } from '../../utils/scope';
import { DutyDto, LocationDto, PolygonDto, UpdatePolygonDto } from './tracking.dto';

const RECENT_LOCATION_MINUTES = 10;
const AVG_CITY_SPEED_KMPH = 18;

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(h));
}

function etaMinutes(distance: number) {
  return Math.max(1, Math.round((distance / AVG_CITY_SPEED_KMPH) * 60));
}

async function googleRoadEta(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): Promise<{ distanceKm: number; etaMinutes: number } | null> {
  if (!env.googleMaps.apiKey) return null;

  const params = new URLSearchParams({
    origins: `${origin.latitude},${origin.longitude}`,
    destinations: `${destination.latitude},${destination.longitude}`,
    mode: 'driving',
    key: env.googleMaps.apiKey,
  });

  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`);
    if (!response.ok) return null;
    const payload = await response.json() as {
      status?: string;
      rows?: Array<{ elements?: Array<{ status?: string; distance?: { value: number }; duration?: { value: number } }> }>;
    };
    const element = payload.rows?.[0]?.elements?.[0];
    if (payload.status !== 'OK' || element?.status !== 'OK' || !element.distance || !element.duration) return null;
    return {
      distanceKm: Number((element.distance.value / 1000).toFixed(2)),
      etaMinutes: Math.max(1, Math.round(element.duration.value / 60)),
    };
  } catch {
    return null;
  }
}

class TrackingService {
  async dutyStatus(driverId: string) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, isOnDuty: true, dutyStartedAt: true, lastSeenAt: true },
    });
    if (!driver) throw ApiError.notFound('Driver not found');
    const latestLocation = await prisma.driverLocation.findFirst({
      where: { driverId },
      orderBy: { recordedAt: 'desc' },
    });
    return { ...driver, latestLocation };
  }

  async setDuty(driverId: string, dto: DutyDto) {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw ApiError.notFound('Driver not found');

    if (dto.isOnDuty) {
      const updated = await prisma.driver.update({
        where: { id: driverId },
        data: {
          isOnDuty: true,
          dutyStartedAt: driver.isOnDuty ? driver.dutyStartedAt : new Date(),
          lastSeenAt: new Date(),
        },
        select: { id: true, isOnDuty: true, dutyStartedAt: true, lastSeenAt: true },
      });
      if (!driver.isOnDuty) {
        await prisma.driverDutySession.create({ data: { driverId, startedAt: updated.dutyStartedAt ?? new Date() } });
      }
      return updated;
    }

    await prisma.driverDutySession.updateMany({
      where: { driverId, endedAt: null },
      data: { endedAt: new Date() },
    });
    return prisma.driver.update({
      where: { id: driverId },
      data: { isOnDuty: false, dutyStartedAt: null, lastSeenAt: new Date() },
      select: { id: true, isOnDuty: true, dutyStartedAt: true, lastSeenAt: true },
    });
  }

  async updateLocation(driverId: string, dto: LocationDto) {
    const driver = await prisma.driver.findUnique({ where: { id: driverId }, select: { id: true, isOnDuty: true } });
    if (!driver) throw ApiError.notFound('Driver not found');
    if (!driver.isOnDuty) throw ApiError.badRequest('Start duty before sharing live location');

    const location = await prisma.driverLocation.create({
      data: { driverId, ...dto },
    });
    await prisma.driver.update({ where: { id: driverId }, data: { lastSeenAt: location.recordedAt } });
    return location;
  }

  async adminLive(user: JwtPayload) {
    const distributorId = scopedDistributorId(user);
    const customerFilter: Prisma.CustomerWhereInput = distributorId ? { distributorId } : {};

    const drivers = await prisma.driver.findMany({
      where: distributorId
        ? { customers: { some: customerFilter } }
        : {},
      select: {
        id: true,
        name: true,
        mobile: true,
        zone: true,
        isOnDuty: true,
        dutyStartedAt: true,
        lastSeenAt: true,
        vehicle: { select: { id: true, number: true, type: true } },
        customers: {
          where: customerFilter,
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const driverIds = drivers.map((d) => d.id);
    const [locations, activeOrders, polygons] = await Promise.all([
      Promise.all(
        driverIds.map((driverId) =>
          prisma.driverLocation.findFirst({ where: { driverId }, orderBy: { recordedAt: 'desc' } })
        )
      ),
      prisma.order.findMany({
        where: {
          status: { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] },
          customer: {
            ...(distributorId ? { distributorId } : {}),
            driverId: { in: driverIds },
          },
        },
        select: {
          id: true,
          orderNumber: true,
          quantity: true,
          status: true,
          customer: { select: { id: true, name: true, mobile: true, area: true, latitude: true, longitude: true, driverId: true } },
        },
      }),
      prisma.serviceAreaPolygon.findMany({
        where: distributorId ? { adminId: distributorId } : {},
        include: { admin: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const locationByDriver = new Map(locations.filter(Boolean).map((l) => [l!.driverId, l]));
    const activeByDriver = activeOrders.reduce<Record<string, Array<{
      id: string;
      status: string;
      customer: { id: string; name: string; mobile: string; area: string | null; latitude: number | null; longitude: number | null };
      order: { id: string; orderNumber: string; quantity: number; status: string };
    }>>>((acc, order) => {
      const driverId = order.customer.driverId;
      if (!driverId) return acc;
      acc[driverId] = acc[driverId] ?? [];
      acc[driverId].push({
        id: order.id,
        status: order.status,
        customer: {
          id: order.customer.id,
          name: order.customer.name,
          mobile: order.customer.mobile,
          area: order.customer.area,
          latitude: order.customer.latitude,
          longitude: order.customer.longitude,
        },
        order: { id: order.id, orderNumber: order.orderNumber, quantity: order.quantity, status: order.status },
      });
      return acc;
    }, {});

    return {
      generatedAt: new Date(),
      drivers: drivers.map((driver) => {
        const location = locationByDriver.get(driver.id) ?? null;
        const isRecent = location ? dayjs().diff(dayjs(location.recordedAt), 'minute') <= RECENT_LOCATION_MINUTES : false;
        return {
          ...driver,
          assignedCustomers: driver.customers.length,
          latestLocation: location,
          isLocationFresh: isRecent,
          activeDeliveries: activeByDriver[driver.id] ?? [],
        };
      }),
      polygons,
    };
  }

  async customerActive(customerId: string) {
    const active = await prisma.order.findFirst({
      where: {
        customerId,
        status: { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            address: true,
            area: true,
            driver: { select: { id: true, name: true, mobile: true, isOnDuty: true, lastSeenAt: true, vehicle: { select: { number: true, type: true } } } },
          },
        },
      },
    });

    if (!active?.customer.driver || !active.customer.driver.isOnDuty) {
      return { trackable: false, reason: 'No active on-duty driver assigned to your delivery yet.' };
    }
    const driver = active.customer.driver;

    const location = await prisma.driverLocation.findFirst({
      where: { driverId: driver.id },
      orderBy: { recordedAt: 'desc' },
    });
    if (!location || dayjs().diff(dayjs(location.recordedAt), 'minute') > RECENT_LOCATION_MINUTES) {
      return { trackable: false, reason: 'Driver location is not available right now.' };
    }

    const hasCustomerGps = active.customer.latitude != null && active.customer.longitude != null;
    const origin = { latitude: location.latitude, longitude: location.longitude };
    const destination = hasCustomerGps
      ? { latitude: active.customer.latitude!, longitude: active.customer.longitude! }
      : null;
    const googleEta = destination ? await googleRoadEta(origin, destination) : null;
    const straightDistance = destination ? distanceKm(origin, destination) : null;

    return {
      trackable: true,
      delivery: {
        id: active.id,
        status: active.status,
        order: { id: active.id, orderNumber: active.orderNumber, quantity: active.quantity, status: active.status },
        customer: {
          id: active.customer.id,
          name: active.customer.name,
          latitude: active.customer.latitude,
          longitude: active.customer.longitude,
          address: active.customer.address,
          area: active.customer.area,
        },
      },
      driver,
      latestLocation: location,
      distanceKm: googleEta?.distanceKm ?? (straightDistance != null ? Number(straightDistance.toFixed(2)) : null),
      etaMinutes: googleEta?.etaMinutes ?? (straightDistance != null ? etaMinutes(straightDistance) : null),
      etaSource: googleEta ? 'GOOGLE_MAPS' : straightDistance != null ? 'STRAIGHT_LINE' : null,
    };
  }

  private resolvePolygonAdmin(user: JwtPayload, requestedAdminId?: string) {
    if (user.role === 'SUPER_ADMIN') {
      if (!requestedAdminId) throw ApiError.badRequest('adminId is required for super admin polygon creation');
      return requestedAdminId;
    }
    return user.sub;
  }

  async createPolygon(user: JwtPayload, dto: PolygonDto) {
    const adminId = this.resolvePolygonAdmin(user, dto.adminId);
    const admin = await prisma.admin.findUnique({ where: { id: adminId }, select: { id: true } });
    if (!admin) throw ApiError.notFound('Admin/distributor not found');
    return prisma.serviceAreaPolygon.create({
      data: {
        adminId,
        name: dto.name,
        geoJson: dto.geoJson,
        color: dto.color ?? '#0E8C84',
        isActive: dto.isActive ?? true,
      },
      include: { admin: { select: { id: true, name: true, email: true } } },
    });
  }

  async updatePolygon(user: JwtPayload, id: string, dto: UpdatePolygonDto) {
    const existing = await prisma.serviceAreaPolygon.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Service polygon not found');
    if (user.role !== 'SUPER_ADMIN' && existing.adminId !== user.sub) throw ApiError.forbidden('You can edit only your own service polygon');
    return prisma.serviceAreaPolygon.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.geoJson ? { geoJson: dto.geoJson } : {}),
        ...(dto.color ? { color: dto.color } : {}),
        ...(dto.isActive != null ? { isActive: dto.isActive } : {}),
      },
      include: { admin: { select: { id: true, name: true, email: true } } },
    });
  }

  async deletePolygon(user: JwtPayload, id: string) {
    const existing = await prisma.serviceAreaPolygon.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Service polygon not found');
    if (user.role !== 'SUPER_ADMIN' && existing.adminId !== user.sub) throw ApiError.forbidden('You can delete only your own service polygon');
    await prisma.serviceAreaPolygon.delete({ where: { id } });
    return { success: true };
  }
}

export const trackingService = new TrackingService();
