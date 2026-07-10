import { z } from 'zod';

export const dutySchema = z.object({
  isOnDuty: z.boolean(),
});

export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
  speed: z.number().optional(),
  heading: z.number().min(0).max(360).optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
});

const coordinateSchema = z.tuple([
  z.number().min(-180).max(180), // longitude
  z.number().min(-90).max(90), // latitude
]);

export const polygonGeoJsonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(coordinateSchema).min(4)).min(1),
});

export const polygonSchema = z.object({
  adminId: z.string().uuid().optional(),
  name: z.string().min(2).max(80),
  geoJson: polygonGeoJsonSchema,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isActive: z.boolean().optional(),
});

export const updatePolygonSchema = polygonSchema.partial().omit({ adminId: true });

export type DutyDto = z.infer<typeof dutySchema>;
export type LocationDto = z.infer<typeof locationSchema>;
export type PolygonDto = z.infer<typeof polygonSchema>;
export type UpdatePolygonDto = z.infer<typeof updatePolygonSchema>;
