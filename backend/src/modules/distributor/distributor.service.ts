import { prisma } from '../../config/prisma';

export interface SuggestParams {
  latitude?: number;
  longitude?: number;
  pincode?: string;
  area?: string;
}

const toRad = (d: number): number => (d * Math.PI) / 180;

/** Great-circle distance between two lat/lng points, in kilometres. */
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371; // earth radius km
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

const norm = (s?: string | null): string => (s ?? '').trim().toLowerCase();

class DistributorService {
  /**
   * Active distributors (regular admins) ranked by how well they serve a given
   * location. A distributor matches if ANY of: the point is within their GPS
   * service radius, they cover the pincode, or a service-area name matches.
   * When nothing matches, every active distributor is returned as a fallback so
   * the customer can still choose one.
   */
  async suggest(params: SuggestParams) {
    const admins = await prisma.admin.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        serviceRadiusKm: true,
        pincodes: true,
        serviceAreas: true,
        areaLinks: { select: { name: true } },
        _count: { select: { distributedCustomers: true } },
      },
    });

    const area = norm(params.area);
    const pincode = (params.pincode ?? '').trim();
    const hasGps = params.latitude != null && params.longitude != null;

    const scored = admins.map((a) => {
      const reasons: string[] = [];
      let distanceKm: number | null = null;

      if (hasGps && a.latitude != null && a.longitude != null) {
        distanceKm = haversineKm(params.latitude!, params.longitude!, a.latitude, a.longitude);
        if (distanceKm <= (a.serviceRadiusKm ?? 5)) reasons.push('nearby');
      }
      if (pincode && a.pincodes.includes(pincode)) reasons.push('pincode');
      if (area) {
        const names = [...a.serviceAreas.map(norm), ...a.areaLinks.map((l) => norm(l.name))];
        if (names.some((n) => n && (n === area || n.includes(area) || area.includes(n)))) {
          reasons.push('area');
        }
      }

      const allAreas = Array.from(new Set([...a.serviceAreas, ...a.areaLinks.map((l) => l.name)]));
      return {
        id: a.id,
        name: a.name,
        serviceAreas: allAreas,
        pincodes: a.pincodes,
        distanceKm: distanceKm == null ? null : Math.round(distanceKm * 10) / 10,
        matchReasons: reasons,
        matched: reasons.length > 0,
        customerCount: a._count.distributedCustomers,
        _rawDistance: distanceKm,
      };
    });

    const byDistance = (x: typeof scored[number], y: typeof scored[number]): number => {
      if (x._rawDistance == null && y._rawDistance == null) return 0;
      if (x._rawDistance == null) return 1;
      if (y._rawDistance == null) return -1;
      return x._rawDistance - y._rawDistance;
    };

    const matched = scored.filter((r) => r.matched).sort(byDistance);
    const list = matched.length ? matched : scored.slice().sort(byDistance);

    // Strip the internal sort key before returning.
    return list.map(({ _rawDistance, ...rest }) => rest);
  }

  /** Flat list of all active distributors (for a manual picker / fallback). */
  async listPublic() {
    const admins = await prisma.admin.findMany({
      where: { role: 'ADMIN', isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        serviceAreas: true,
        pincodes: true,
        areaLinks: { select: { name: true } },
        _count: { select: { distributedCustomers: true } },
      },
    });
    return admins.map((a) => ({
      id: a.id,
      name: a.name,
      serviceAreas: Array.from(new Set([...a.serviceAreas, ...a.areaLinks.map((l) => l.name)])),
      pincodes: a.pincodes,
      customerCount: a._count.distributedCustomers,
    }));
  }
}

export const distributorService = new DistributorService();
