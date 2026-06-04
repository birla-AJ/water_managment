import { useState } from 'react';
import { Box, Card, CardContent, Grid, TextField, MenuItem, Button, Stack, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../api/endpoints';
import { useAppSelector } from '../app/hooks';
import PageHeader from '../components/PageHeader';

const TYPES = ['daily', 'weekly', 'monthly', 'yearly', 'revenue', 'customer', 'inventory', 'order', 'payment'];

export default function Reports() {
  const [type, setType] = useState('monthly');
  const token = useAppSelector((s) => s.auth.accessToken);

  const { data, isLoading } = useQuery({ queryKey: ['report', type], queryFn: () => reportApi.get(type, {}) });

  const columns: GridColDef[] = (data?.columns ?? []).map((c: string) => ({ field: c, headerName: c, flex: 1, minWidth: 120 }));
  const rows = (data?.rows ?? []).map((r: Record<string, unknown>, i: number) => ({ id: i, ...r }));

  const download = (format: string) => {
    // Token is appended for the file route which also accepts the Authorization header;
    // for simplicity in a browser download we open with a fetch + blob.
    fetch(reportApi.exportUrl(type, format), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-report.${format === 'excel' ? 'xlsx' : format}`;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  return (
    <Box>
      <PageHeader title="Reports" subtitle="Generate & export business reports" />
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField select label="Report Type" value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 200 }}>
              {TYPES.map((t) => <MenuItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</MenuItem>)}
            </TextField>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="outlined" onClick={() => download('excel')}>Export Excel</Button>
            <Button variant="outlined" onClick={() => download('csv')}>Export CSV</Button>
            <Button variant="outlined" onClick={() => download('pdf')}>Export PDF</Button>
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6" mb={2}>{data?.title ?? 'Report'}</Typography>
          <DataGrid autoHeight rows={rows} columns={columns} loading={isLoading} disableRowSelectionOnClick pageSizeOptions={[10, 25, 50, 100]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} />
        </CardContent>
      </Card>
    </Box>
  );
}
