import { Chip } from '@mui/material';

const COLORS: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  ACTIVE: 'success',
  INACTIVE: 'default',
  PENDING: 'warning',
  ACCEPTED: 'info',
  PROCESSING: 'info',
  DELIVERED: 'success',
  CANCELLED: 'error',
  PAID: 'success',
  PARTIALLY_PAID: 'warning',
  OVERDUE: 'error',
  SUCCESS: 'success',
  FAILED: 'error',
  REFUNDED: 'default',
};

export default function StatusChip({ status }: { status: string }) {
  return <Chip size="small" label={status.replace(/_/g, ' ')} color={COLORS[status] ?? 'default'} variant="filled" />;
}
