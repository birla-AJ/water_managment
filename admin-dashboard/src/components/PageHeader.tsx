import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';

export default function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
      <Box>
        <Typography variant="h4">{title}</Typography>
        {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
      </Box>
      {action}
    </Box>
  );
}
