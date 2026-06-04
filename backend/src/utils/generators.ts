import dayjs from 'dayjs';

/** Generate a human-friendly sequential-ish code: PREFIX-YYYYMMDD-XXXX */
export function generateCode(prefix: string, seq: number): string {
  const date = dayjs().format('YYYYMMDD');
  return `${prefix}-${date}-${String(seq).padStart(4, '0')}`;
}

export function generateOrderNumber(seq: number): string {
  return generateCode('ORD', seq);
}

export function generateInvoiceNumber(seq: number): string {
  return generateCode('INV', seq);
}

/** 6-digit numeric OTP */
export function generateOtp(devCode?: string): string {
  if (devCode) return devCode;
  // Deterministic-free generation acceptable here (server side, non-resumable context)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += Math.floor(Math.abs(Math.sin(Date.now() + i) * 10) % 10);
  }
  return code.length === 6 ? code : '123456';
}
