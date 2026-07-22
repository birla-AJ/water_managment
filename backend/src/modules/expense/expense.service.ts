import { ExpenseCategory, PaymentMethod, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { ExpenseDto } from './expense.dto';

type Period = 'day' | 'week' | 'month' | 'year' | 'all';

function dates(period: Period) {
  const now = new Date();
  if (period === 'all') return undefined;
  const start = new Date(now);
  if (period === 'day') start.setHours(0, 0, 0, 0);
  if (period === 'week') { start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0); }
  if (period === 'month') { start.setDate(1); start.setHours(0, 0, 0, 0); }
  if (period === 'year') { start.setMonth(0, 1); start.setHours(0, 0, 0, 0); }
  return { gte: start, lte: now };
}

class ExpenseService {
  private where(adminId: string, period: Period = 'all', category?: ExpenseCategory, search?: string): Prisma.ExpenseWhereInput {
    return {
      adminId,
      ...(dates(period) ? { expenseDate: dates(period) } : {}),
      ...(category ? { category } : {}),
      ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { notes: { contains: search, mode: 'insensitive' } }] } : {}),
    };
  }

  async list(adminId: string, params: { skip: number; take: number; period?: Period; category?: ExpenseCategory; search?: string }) {
    const where = this.where(adminId, params.period, params.category, params.search);
    const [items, total, sum] = await Promise.all([
      prisma.expense.findMany({ where, orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }], skip: params.skip, take: params.take }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);
    return { items, total, totalAmount: Number(sum._sum.amount ?? 0) };
  }

  async create(adminId: string, dto: ExpenseDto) {
    return prisma.expense.create({ data: { ...dto, amount: new Prisma.Decimal(dto.amount), adminId } });
  }

  async remove(adminId: string, id: string) {
    const expense = await prisma.expense.findFirst({ where: { id, adminId } });
    if (!expense) throw ApiError.notFound('Expense not found');
    await prisma.expense.delete({ where: { id } });
  }

  async exportRows(adminId: string, period: Period, category?: ExpenseCategory) {
    return prisma.expense.findMany({ where: this.where(adminId, period, category), orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }] });
  }
}

export const expenseService = new ExpenseService();
