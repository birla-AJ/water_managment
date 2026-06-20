import { useState } from 'react';
import { Box, Card, CardContent, TextField, MenuItem, Button, Stack, Typography, Chip } from '@mui/material';
import GridOnIcon from '@mui/icons-material/GridOn';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../api/endpoints';
import { useAppSelector } from '../app/hooks';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';
import { dataGridSx } from '../theme/dataGrid';

const TYPES = ['daily', 'weekly', 'monthly', 'yearly', 'revenue', 'customer', 'inventory', 'order', 'payment'];

// Heuristics so dynamically-built report columns still render rich cells.
const isStatusCol = (f: string) => /status/i.test(f);
const isTypeCol = (f: string) => /^type$/i.test(f);
const isAmountCol = (f: string) => /(amount|revenue|total|paid|due|price)/i.test(f);

export default function Reports() {
  const [type, setType] = useState('monthly');
  const [downloading, setDownloading] = useState('');
  const token = useAppSelector((s) => s.auth.accessToken);

  const { data, isLoading } = useQuery({ queryKey: ['report', type], queryFn: () => reportApi.get(type, {}) });

  const columns: GridColDef[] = (data?.columns ?? []).map((c: string): GridColDef => {
    const base: GridColDef = { field: c, headerName: c, flex: 1, minWidth: 120 };
    if (isStatusCol(c)) {
      return { ...base, minWidth: 140, renderCell: (p) => (p.value ? <StatusChip status={String(p.value)} /> : null) };
    }
    if (isTypeCol(c)) {
      return {
        ...base, minWidth: 110, renderCell: (p) => p.value ? (
          <Chip
            size="small" label={String(p.value)} variant="outlined"
            sx={{
              fontWeight: 700, fontSize: 11.5, height: 22,
              color: String(p.value).toUpperCase() === 'EXTRA' ? '#B6831A' : '#0E8C84',
              borderColor: String(p.value).toUpperCase() === 'EXTRA' ? 'rgba(202,138,4,0.4)' : 'rgba(14,140,132,0.4)',
              bgcolor: String(p.value).toUpperCase() === 'EXTRA' ? 'rgba(202,138,4,0.08)' : 'rgba(14,140,132,0.08)',
            }}
          />
        ) : null,
      };
    }
    if (isAmountCol(c)) {
      return { ...base, align: 'right', headerAlign: 'right', renderCell: (p) => <Typography variant="body2" fontWeight={700}>{String(p.value ?? '')}</Typography> };
    }
    return base;
  });
  const rows = (data?.rows ?? []).map((r: Record<string, unknown>, i: number) => ({ id: i, ...r }));

  const download = (format: string) => {
    setDownloading(format);
    fetch(reportApi.exportUrl(type, format), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-report.${format === 'excel' ? 'xlsx' : format}`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .finally(() => setDownloading(''));
  };

  return (
    <Box>
      <PageHeader title="Reports" subtitle="Generate & export business reports" />

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <TextField select label="Report Type" value={type} onChange={(e) => setType(e.target.value)} size="small" sx={{ minWidth: 200 }}>
              {TYPES.map((t) => <MenuItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</MenuItem>)}
            </TextField>
            <Box sx={{ flexGrow: 1 }} />
            <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
              <Button
                variant="outlined" startIcon={<GridOnIcon />} disabled={!!downloading}
                onClick={() => download('excel')}
                sx={{ color: '#179A33', borderColor: 'rgba(23,154,51,0.4)', '&:hover': { borderColor: '#179A33', bgcolor: 'rgba(23,154,51,0.06)' } }}
              >
                {downloading === 'excel' ? 'Exporting…' : 'Export Excel'}
              </Button>
              <Button
                variant="outlined" startIcon={<DescriptionOutlinedIcon />} disabled={!!downloading}
                onClick={() => download('csv')}
              >
                {downloading === 'csv' ? 'Exporting…' : 'Export CSV'}
              </Button>
              <Button
                variant="outlined" startIcon={<PictureAsPdfOutlinedIcon />} disabled={!!downloading}
                onClick={() => download('pdf')}
                sx={{ color: '#D32F2F', borderColor: 'rgba(211,47,47,0.4)', '&:hover': { borderColor: '#D32F2F', bgcolor: 'rgba(211,47,47,0.06)' } }}
              >
                {downloading === 'pdf' ? 'Exporting…' : 'Export PDF'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <Typography variant="h6">{data?.title ?? 'Report'}</Typography>
            <Chip
              label={`${rows.length} row${rows.length === 1 ? '' : 's'}`}
              size="small"
              sx={{ fontWeight: 700, bgcolor: 'rgba(5,81,82,0.10)', color: 'primary.main' }}
            />
          </Stack>
          <DataGrid
            autoHeight rows={rows} columns={columns} loading={isLoading}
            disableRowSelectionOnClick pageSizeOptions={[10, 25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            rowHeight={56}
            sx={dataGridSx}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
