import { useState } from 'react';
import { Box, Card, TextField, MenuItem, Stack } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { orderApi } from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';

const STATUSES = ['PENDING', 'ACCEPTED', 'PROCESSING', 'DELIVERED', 'CANCELLED'];

export default function Orders() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', status, type, page, pageSize],
    queryFn: () => orderApi.list({ status: status || undefined, type: type || undefined, page: page + 1, limit: pageSize }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, s }: { id: string; s: string }) => orderApi.updateStatus(id, s),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); enqueueSnackbar('Order updated', { variant: 'success' }); },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const columns: GridColDef[] = [
    { field: 'orderNumber', headerName: 'Order #', width: 170 },
    { field: 'customer', headerName: 'Customer', flex: 1, minWidth: 150, valueGetter: (_v, row) => row.customer?.name },
    { field: 'type', headerName: 'Type', width: 100 },
    { field: 'quantity', headerName: 'Qty', width: 70 },
    { field: 'orderDate', headerName: 'Date', width: 120, valueFormatter: (v) => dayjs(v).format('DD MMM YYYY') },
    { field: 'status', headerName: 'Status', width: 130, renderCell: (p) => <StatusChip status={p.value} /> },
    {
      field: 'action', headerName: 'Update Status', width: 170, sortable: false,
      renderCell: (p) => (
        <TextField select size="small" value={p.row.status} onChange={(e) => updateStatus.mutate({ id: p.row.id, s: e.target.value })} sx={{ width: 150 }}>
          {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Orders" subtitle="Regular & extra camper orders" />
      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} size="small" sx={{ minWidth: 160 }}>
            <MenuItem value="">All</MenuItem>{STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
          <TextField select label="Type" value={type} onChange={(e) => setType(e.target.value)} size="small" sx={{ minWidth: 160 }}>
            <MenuItem value="">All</MenuItem><MenuItem value="REGULAR">Regular</MenuItem><MenuItem value="EXTRA">Extra</MenuItem>
          </TextField>
        </Stack>
      </Card>
      <Card>
        <DataGrid
          autoHeight rows={data?.data ?? []} columns={columns} loading={isLoading}
          rowCount={data?.meta?.total ?? 0} paginationMode="server"
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(m) => { setPage(m.page); setPageSize(m.pageSize); }}
          pageSizeOptions={[10, 20, 50]} disableRowSelectionOnClick
        />
      </Card>
    </Box>
  );
}
