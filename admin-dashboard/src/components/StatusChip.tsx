import { Box } from '@mui/material';

// Each status → foreground (text + dot) and a soft tinted background, all drawn
// from the warm WaterFlow palette. No more clashing default MUI blue.
type Tone = { fg: string; bg: string };

const TEAL: Tone = { fg: '#055152', bg: 'rgba(5,81,82,0.12)' };
const AQUA: Tone = { fg: '#0E8C84', bg: 'rgba(14,140,132,0.14)' };
const GREEN: Tone = { fg: '#179A33', bg: 'rgba(23,154,51,0.12)' };
const GOLD: Tone = { fg: '#B6831A', bg: 'rgba(202,138,4,0.16)' };
const RED: Tone = { fg: '#D32F2F', bg: 'rgba(211,47,47,0.12)' };
const GREY: Tone = { fg: '#7C8A86', bg: 'rgba(124,138,134,0.16)' };

const MAP: Record<string, Tone> = {
  ACTIVE: GREEN,
  INACTIVE: GREY,
  PENDING: GOLD,
  ACCEPTED: TEAL,
  PROCESSING: AQUA,
  DELIVERED: GREEN,
  CANCELLED: RED,
  PAID: GREEN,
  PARTIALLY_PAID: GOLD,
  OVERDUE: RED,
  SUCCESS: GREEN,
  FAILED: RED,
  REFUNDED: GREY,
};

export default function StatusChip({ status }: { status: string }) {
  const tone = MAP[status] ?? GREY;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.1,
        py: 0.35,
        borderRadius: 999,
        bgcolor: tone.bg,
        color: tone.fg,
        border: `1px solid ${tone.fg}33`,
        fontWeight: 700,
        fontSize: 12.5,
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
      }}
    >
      <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: tone.fg, flexShrink: 0 }} />
      {status.replace(/_/g, ' ')}
    </Box>
  );
}
