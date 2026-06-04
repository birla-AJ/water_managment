import { Card, CardActionArea, CardContent, Box, Typography, Stack } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { ReactNode } from 'react';
import { BRAND_GRADIENT } from '../theme/theme';

interface Props {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  /** Accent colour (hex) for the gradient chip, top bar and glow. Defaults to brand teal. */
  color?: string;
  subtitle?: string;
  /** Optional trend pill, e.g. { value: '12%', up: true }. */
  trend?: { value: string; up?: boolean };
  /** Makes the whole card clickable (ripple + hover lift + arrow hint). */
  onClick?: () => void;
}

export default function StatCard({ title, value, icon, color, subtitle, trend, onClick }: Props) {
  const accent = color ?? '#2DD4BF';
  const chipGradient = color ? `linear-gradient(135deg, ${accent} 0%, ${accent}bb 100%)` : BRAND_GRADIENT;
  const clickable = !!onClick;

  const body = (
    <CardContent sx={{ p: 2.5, position: 'relative', overflow: 'hidden' }}>
      {/* futuristic accent glow */}
      <Box
        sx={{
          position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: '50%',
          background: accent, filter: 'blur(60px)', opacity: 0.16, pointerEvents: 'none',
        }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, position: 'relative' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600} noWrap>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ mt: 0.75 }}>
            {value}
          </Typography>
        </Box>
        {icon && (
          <Box
            sx={{
              background: chipGradient, color: '#fff', p: 1.25, borderRadius: 3, display: 'flex',
              boxShadow: `0 10px 24px -8px ${accent}`,
            }}
          >
            {icon}
          </Box>
        )}
      </Box>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.25, minHeight: 22 }} useFlexGap flexWrap="wrap">
        {trend && (
          <Stack
            direction="row" spacing={0.3} alignItems="center"
            sx={{
              color: trend.up ? 'success.main' : 'error.main',
              bgcolor: trend.up ? 'rgba(22,163,74,0.10)' : 'rgba(239,68,68,0.10)',
              px: 0.8, py: 0.2, borderRadius: 1.5, fontWeight: 700, fontSize: 12.5,
            }}
          >
            {trend.up ? <TrendingUpIcon sx={{ fontSize: 15 }} /> : <TrendingDownIcon sx={{ fontSize: 15 }} />}
            {trend.value}
          </Stack>
        )}
        {subtitle && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {subtitle}
          </Typography>
        )}
        {clickable && (
          <ArrowForwardIcon
            className="stat-arrow"
            sx={{ fontSize: 18, color: accent, ml: 'auto', opacity: 0, transform: 'translateX(-4px)', transition: 'all .2s ease' }}
          />
        )}
      </Stack>
    </CardContent>
  );

  return (
    <Card
      sx={{
        height: '100%', position: 'relative', overflow: 'hidden',
        // neon top accent bar
        '&::before': {
          content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: chipGradient, opacity: 0.9, zIndex: 1,
        },
        '&:hover': {
          transform: 'translateY(-4px)',
          borderColor: `${accent}66`,
          boxShadow: `0 18px 40px -16px ${accent}99`,
        },
        '&:hover .stat-arrow': { opacity: 1, transform: 'translateX(0)' },
      }}
    >
      {clickable ? <CardActionArea onClick={onClick} sx={{ height: '100%' }}>{body}</CardActionArea> : body}
    </Card>
  );
}
