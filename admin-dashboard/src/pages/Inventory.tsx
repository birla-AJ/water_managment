import { useState } from 'react';
import { Box, Card, CardContent, Grid, Typography, TextField, MenuItem, Button, Stack } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { inventoryApi } from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';

const ACTIONS = ['STOCK_IN', 'FILLED', 'EMPTIED', 'ALLOCATED', 'RETURNED', 'DAMAGED', 'LOST', 'ADJUSTMENT'];

export default function Inventory() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [action, setAction] = useState('STOCK_IN');
  const [quantity, setQuantity] = useState(10);
  const [remarks, setRemarks] = useState('');

  const { data: inv } = useQuery({ queryKey: ['inventory'], queryFn: inventoryApi.get });
  const { data: logs } = useQuery({ queryKey: ['inventory-logs'], queryFn: () => inventoryApi.logs({ limit: 50 }) });

  const adjust = useMutation({
    mutationFn: () => inventoryApi.adjust(action, Number(quantity), remarks),
    onSuccess: (data) => {
      enqueueSnackbar('Inventory updated', { variant: 'success' });
      // Instantly reflect the new counts from the API response (no refetch lag).
      if (data) qc.setQueryData(['inventory'], data);
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-logs'] });
      // Keep the Dashboard in sync too (its overview/charts cache the same numbers).
      qc.invalidateQueries({ queryKey: ['overview'] });
      qc.invalidateQueries({ queryKey: ['charts'] });
      setRemarks('');
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const columns: GridColDef[] = [
    { field: 'createdAt', headerName: 'Date', width: 170, valueFormatter: (v) => dayjs(v).format('DD MMM YYYY HH:mm') },
    { field: 'action', headerName: 'Action', width: 130 },
    { field: 'quantity', headerName: 'Qty', width: 80 },
    { field: 'admin', headerName: 'By', width: 140, valueGetter: (_v, row) => row.admin?.name ?? 'System' },
    { field: 'remarks', headerName: 'Remarks', flex: 1, minWidth: 150 },
  ];

  return (
    <Box>
      <PageHeader title="Inventory" subtitle="Track campers across their lifecycle" />
      <Grid container spacing={2} mb={2}>
        <Grid item xs={6} md={3}><StatCard title="Total" value={inv?.totalCampers ?? 0} /></Grid>
        <Grid item xs={6} md={3}><StatCard title="Filled" value={inv?.filledCampers ?? 0} color="#055152" /></Grid>
        <Grid item xs={6} md={3}><StatCard title="Empty" value={inv?.emptyCampers ?? 0} color="#0E8C84" /></Grid>
        <Grid item xs={6} md={3}><StatCard title="Allocated" value={inv?.allocatedCampers ?? 0} color="#C68A3E" /></Grid>
        <Grid item xs={6} md={3}><StatCard title="Returned" value={inv?.returnedCampers ?? 0} color="#179A33" /></Grid>
        <Grid item xs={6} md={3}><StatCard title="Damaged" value={inv?.damagedCampers ?? 0} color="#DABD71" /></Grid>
        <Grid item xs={6} md={3}><StatCard title="Lost" value={inv?.lostCampers ?? 0} color="#D32F2F" /></Grid>
      </Grid>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" mb={2}>Record Stock Movement</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField select label="Action" value={action} onChange={(e) => setAction(e.target.value)} sx={{ minWidth: 180 }}>
              {ACTIONS.map((a) => <MenuItem key={a} value={a}>{a.replace('_', ' ')}</MenuItem>)}
            </TextField>
            <TextField label="Quantity" type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} sx={{ width: 140 }} />
            <TextField label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} fullWidth />
            <Button variant="contained" onClick={() => adjust.mutate()} disabled={adjust.isPending}>Apply</Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" mb={2}>Inventory Logs</Typography>
          <DataGrid autoHeight rows={logs?.data ?? []} columns={columns} disableRowSelectionOnClick pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} />
        </CardContent>
      </Card>
    </Box>
  );
}
