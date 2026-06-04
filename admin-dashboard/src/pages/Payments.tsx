import { useState } from 'react';
import { Box, Card, TextField, MenuItem, Stack, Button } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { paymentApi } from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';

const STATUSES = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'];

export default function Payments() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['payments', status], queryFn: () => paymentApi.list({ status: status || undefined, limit: 100 }) });

  const refund = useMutation({
    mutationFn: (id: string) => paymentApi.refund(id),
    onSuccess: () => { enqueueSnackbar('Refunded', { variant: 'success' }); qc.invalidateQueries({ queryKey: ['payments'] }); },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const columns: GridColDef[] = [
    { field: 'createdAt', headerName: 'Date', width: 160, valueFormatter: (v) => dayjs(v).format('DD MMM YYYY HH:mm') },
    { field: 'customer', headerName: 'Customer', flex: 1, minWidth: 140, valueGetter: (_v, row) => row.customer?.name },
    { field: 'invoice', headerName: 'Invoice', width: 160, valueGetter: (_v, row) => row.invoice?.invoiceNumber ?? '—' },
    { field: 'amount', headerName: 'Amount', width: 110, valueFormatter: (v) => `₹${v}` },
    { field: 'method', headerName: 'Method', width: 110 },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <StatusChip status={p.value} /> },
    {
      field: 'actions', headerName: 'Actions', width: 120, sortable: false,
      renderCell: (p) => p.row.status === 'SUCCESS' ? <Button size="small" color="warning" onClick={() => refund.mutate(p.row.id)}>Refund</Button> : null,
    },
  ];

  return (
    <Box>
      <PageHeader title="Payments" subtitle="Razorpay & manual payments" />
      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2}>
          <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} size="small" sx={{ minWidth: 160 }}>
            <MenuItem value="">All</MenuItem>{STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
        </Stack>
      </Card>
      <Card>
        <DataGrid autoHeight rows={data?.data ?? []} columns={columns} loading={isLoading} disableRowSelectionOnClick pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} />
      </Card>
    </Box>
  );
}
