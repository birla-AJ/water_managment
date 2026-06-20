import { JwtPayload } from './jwt';

/**
 * Per-distributor data scoping.
 *
 * A regular ADMIN acts as a distributor and may only see the customers assigned
 * to them (Customer.distributorId === their id) and anything derived from those
 * customers (orders, invoices, payments, dashboard figures). The SUPER_ADMIN is
 * unrestricted. Non-admin principals get an empty (unrestricted) filter — these
 * helpers are only ever used on admin-guarded routes.
 */

/** Whether the request is from a regular admin who should be scoped. */
export function scopedDistributorId(user?: JwtPayload): string | undefined {
  if (!user || user.principal !== 'admin') return undefined;
  if (user.role === 'SUPER_ADMIN') return undefined;
  return user.sub;
}

/** Customer-table filter: `{ distributorId }` for a scoped admin, else `{}`. */
export function customerScope(user?: JwtPayload): { distributorId?: string } {
  const id = scopedDistributorId(user);
  return id ? { distributorId: id } : {};
}

/** Filter for tables that relate to a customer (orders, invoices, payments…). */
export function customerRelationScope(user?: JwtPayload): { customer?: { distributorId: string } } {
  const id = scopedDistributorId(user);
  return id ? { customer: { distributorId: id } } : {};
}
