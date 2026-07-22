import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { ExpenseCategory } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { created, noContent, ok } from '../../utils/apiResponse';
import { buildMeta, getPagination } from '../../utils/pagination';
import { scopedDistributorId } from '../../utils/scope';
import { expenseService } from './expense.service';

const adminId = (req: Request) => scopedDistributorId(req.user) ?? req.user!.sub;

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const result = await expenseService.list(adminId(req), { skip, take: limit, period: req.query.period as never, category: req.query.category as ExpenseCategory | undefined, search: req.query.search as string | undefined });
  ok(res, { items: result.items, totalAmount: result.totalAmount }, 'Expenses', buildMeta(result.total, page, limit));
});

export const create = asyncHandler(async (req, res) => created(res, await expenseService.create(adminId(req), req.body), 'Expense added'));
export const remove = asyncHandler(async (req, res) => { await expenseService.remove(adminId(req), req.params.id); noContent(res); });

export const exportExcel = asyncHandler(async (req: Request, res: Response) => {
  const rows = await expenseService.exportRows(adminId(req), (req.query.period as never) ?? 'all', req.query.category as ExpenseCategory | undefined);
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Expenses');
  ws.addRow(['Date', 'Title', 'Category', 'Payment Mode', 'Amount', 'Notes']).font = { bold: true };
  rows.forEach((e) => ws.addRow([e.expenseDate.toISOString().slice(0, 10), e.title, e.category, e.paymentMode, Number(e.amount), e.notes ?? '']));
  ws.columns.forEach((c) => { c.width = 20; });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="waterflow-expenses.xlsx"');
  await wb.xlsx.write(res); res.end();
});
