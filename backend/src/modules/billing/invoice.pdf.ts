import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { env } from '../../config/env';

interface InvoicePdfData {
  invoiceNumber: string;
  business: { name: string; address?: string; phone?: string; email?: string; gstin?: string };
  customer: { name: string; mobile: string; address?: string };
  periodStart: string;
  periodEnd: string;
  items: Array<{ description: string; quantity: number; rate: number; amount: number }>;
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate?: string;
  notes?: string;
  /** Period usage summary so the customer understands what's billed. */
  summary?: { campersReceived: number; deliveryDays: number; skippedDays: number; ratePerCamper: number };
}

// ── Brand palette (teal / ocean) ────────────────────────────────────────────
const BRAND = '#0F766E';
const BRAND_LIGHT = '#CFF5EE';
const ACCENT = '#14B8A6';
const INK = '#1F2937';
const MUTED = '#6B7280';
const LINE = '#E5E7EB';
const ZEBRA = '#F5FAF9';
const SOFT = '#EAF7F5';
const GREEN = '#059669';
const RED = '#DC2626';
const AMBER = '#D97706';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const L = 50;
const R = 545;
const CONTENT_W = R - L; // 495

const money = (n: number) =>
  `Rs. ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || 'W';

/** Render an invoice PDF to disk and return its public-relative path. */
export function generateInvoicePdf(data: InvoicePdfData): Promise<string> {
  return new Promise((resolve, reject) => {
    const dir = path.resolve(process.cwd(), env.uploads.dir, 'invoices');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filename = `${data.invoiceNumber}.pdf`;
    const filePath = path.join(dir, filename);

    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const bold = (size: number, color = INK) => doc.font('Helvetica-Bold').fontSize(size).fillColor(color);
    const reg = (size: number, color = INK) => doc.font('Helvetica').fontSize(size).fillColor(color);

    // ── Header band ─────────────────────────────────────────────────────────
    const BAND = 150;
    doc.rect(0, 0, PAGE_W, BAND).fill(BRAND);
    doc.rect(0, BAND, PAGE_W, 4).fill(ACCENT);

    // Logo circle (initials)
    doc.circle(80, 58, 28).fill('#E6FFFB');
    bold(18, BRAND).text(initialsOf(data.business.name), 52, 49, { width: 56, align: 'center' });

    // Business name + contact under it
    bold(20, '#FFFFFF').text(data.business.name, 122, 40, { width: 280 });
    reg(9, BRAND_LIGHT);
    let hy = 68;
    const hline = (t?: string) => { if (t) { doc.text(t, 122, hy, { width: 280 }); hy += 13; } };
    hline(data.business.address);
    hline(data.business.phone ? `Phone: ${data.business.phone}` : undefined);
    hline(data.business.email ? `Email: ${data.business.email}` : undefined);
    hline(data.business.gstin ? `GSTIN: ${data.business.gstin}` : undefined);

    // INVOICE title (right)
    bold(30, '#FFFFFF').text('INVOICE', 300, 44, { width: 245, align: 'right' });
    reg(11, BRAND_LIGHT).text(`No. ${data.invoiceNumber}`, 300, 84, { width: 245, align: 'right' });

    // ── Status pill ───────────────────────────────────────────────────────────
    const paid = data.dueAmount <= 0.0001;
    const partial = !paid && data.paidAmount > 0.0001;
    const status = paid ? 'PAID' : partial ? 'PARTIALLY PAID' : 'PAYMENT DUE';
    const statusColor = paid ? GREEN : partial ? AMBER : RED;
    const statusTint = paid ? '#D1FAE5' : partial ? '#FEF3C7' : '#FEE2E2';
    const pillW = paid ? 64 : partial ? 122 : 112;
    doc.roundedRect(R - pillW, 172, pillW, 22, 11).fill(statusTint);
    bold(9, statusColor).text(status, R - pillW, 179, { width: pillW, align: 'center' });

    // ── Bill To (left) ──────────────────────────────────────────────────────
    bold(9, MUTED).text('BILL TO', L, 176, { characterSpacing: 1 });
    bold(13, INK).text(data.customer.name, L, 190, { width: 250 });
    reg(10, MUTED);
    doc.text(data.customer.mobile, L, doc.y + 2, { width: 250 });
    if (data.customer.address) doc.text(data.customer.address, L, doc.y + 1, { width: 250 });

    // ── Invoice meta (right) ──────────────────────────────────────────────────
    const metaRow = (label: string, value: string, y: number) => {
      reg(9, MUTED).text(label, 300, y, { width: 120, align: 'right' });
      bold(9.5, INK).text(value, 425, y, { width: 120, align: 'right' });
    };
    metaRow('Billing Period', `${data.periodStart} - ${data.periodEnd}`, 204);
    if (data.dueDate) metaRow('Due Date', data.dueDate, 222);

    // ── Delivery summary strip ────────────────────────────────────────────────
    let y = 262;
    if (data.summary) {
      bold(9, MUTED).text('DELIVERY SUMMARY', L, y, { characterSpacing: 1 });
      y += 16;
      const cards: Array<[string, string, string]> = [
        ['Campers Received', String(data.summary.campersReceived), BRAND],
        ['Delivery Days', String(data.summary.deliveryDays), ACCENT],
        ['Skipped Days', String(data.summary.skippedDays), RED],
        ['Rate / Camper', money(data.summary.ratePerCamper), INK],
      ];
      const gap = 10;
      const bw = (CONTENT_W - gap * 3) / 4;
      cards.forEach(([label, value, color], i) => {
        const x = L + i * (bw + gap);
        doc.roundedRect(x, y, bw, 56, 10).lineWidth(1).fillAndStroke(ZEBRA, LINE);
        reg(8, MUTED).text(label.toUpperCase(), x + 10, y + 11, { width: bw - 16, characterSpacing: 0.5 });
        bold(16, color).text(value, x + 10, y + 28, { width: bw - 16 });
      });
      y += 56 + 26;
    }

    // ── Items table ────────────────────────────────────────────────────────────
    const colDescX = L + 12, colDescW = 235;
    const colQtyX = 300, colQtyW = 50;
    const colRateX = 355, colRateW = 90;
    const colAmtX = 450, colAmtW = 83;

    doc.rect(L, y, CONTENT_W, 28).fill(BRAND);
    bold(9.5, '#FFFFFF');
    doc.text('DESCRIPTION', colDescX, y + 9);
    doc.text('QTY', colQtyX, y + 9, { width: colQtyW, align: 'right' });
    doc.text('RATE', colRateX, y + 9, { width: colRateW, align: 'right' });
    doc.text('AMOUNT', colAmtX, y + 9, { width: colAmtW, align: 'right' });
    y += 28;

    const rowH = 26;
    data.items.forEach((it, i) => {
      if (i % 2 === 1) doc.rect(L, y, CONTENT_W, rowH).fill(ZEBRA);
      const ty = y + 8;
      reg(10, INK).text(it.description, colDescX, ty, { width: colDescW });
      reg(10, INK).text(String(it.quantity), colQtyX, ty, { width: colQtyW, align: 'right' });
      reg(10, MUTED).text(money(it.rate), colRateX, ty, { width: colRateW, align: 'right' });
      bold(10, INK).text(money(it.amount), colAmtX, ty, { width: colAmtW, align: 'right' });
      y += rowH;
    });
    doc.moveTo(L, y).lineTo(R, y).lineWidth(1).strokeColor(LINE).stroke();

    // ── Notes (left) + Totals (right) ───────────────────────────────────────────
    const totalsTop = y + 16;
    if (data.notes) {
      bold(9, MUTED).text('REMARKS', L, totalsTop, { characterSpacing: 1 });
      reg(9.5, INK).text(data.notes, L, totalsTop + 14, { width: 230 });
    }

    const boxX = 320, boxW = R - boxX;
    let sy = totalsTop;
    const totalRow = (label: string, value: string, opts: { bold?: boolean; color?: string } = {}) => {
      (opts.bold ? bold(10.5, opts.color ?? INK) : reg(10, MUTED)).text(label, boxX, sy, { width: 110 });
      (opts.bold ? bold(10.5, opts.color ?? INK) : reg(10, INK)).text(value, boxX + 110, sy, { width: boxW - 110, align: 'right' });
      sy += 20;
    };
    totalRow('Sub Total', money(data.subTotal));
    totalRow('Tax', money(data.taxAmount));
    doc.moveTo(boxX, sy - 2).lineTo(R, sy - 2).lineWidth(1).strokeColor(LINE).stroke();
    sy += 4;
    totalRow('Total', money(data.totalAmount), { bold: true });
    totalRow('Paid', money(data.paidAmount), { bold: true, color: GREEN });
    sy += 4;
    const dueColor = paid ? GREEN : RED;
    doc.roundedRect(boxX, sy, boxW, 34, 8).fill(dueColor);
    bold(11, '#FFFFFF').text(paid ? 'Amount Paid' : 'Amount Due', boxX + 12, sy + 11);
    bold(13, '#FFFFFF').text(money(paid ? data.totalAmount : data.dueAmount), boxX, sy + 10, { width: boxW - 12, align: 'right' });

    // ── Footer: "Need help?" contact band ───────────────────────────────────────
    const bandY = PAGE_H - 92;
    doc.rect(0, bandY, PAGE_W, 92).fill(SOFT);
    doc.rect(0, bandY, PAGE_W, 3).fill(ACCENT);

    bold(11, BRAND).text('Need help with this bill?', L, bandY + 16);
    reg(9, MUTED);
    let fy = bandY + 34;
    const fline = (t?: string) => { if (t) { doc.text(t, L, fy, { width: 300 }); fy += 13; } };
    fline(data.business.phone ? `Call / WhatsApp: ${data.business.phone}` : undefined);
    fline(data.business.email ? `Email: ${data.business.email}` : undefined);
    fline(data.business.address ? `Address: ${data.business.address}` : undefined);

    bold(13, BRAND).text('Thank you for your business!', 300, bandY + 28, { width: 245, align: 'right' });
    reg(8, MUTED).text('This is a computer-generated invoice and does not require a signature.', 300, bandY + 50, { width: 245, align: 'right' });

    doc.end();
    stream.on('finish', () => resolve(`/uploads/invoices/${filename}`));
    stream.on('error', reject);
  });
}
