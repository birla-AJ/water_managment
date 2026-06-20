import { useState } from 'react';
import { Box, Card, TextField, MenuItem, Stack, Select, Typography, Chip, Button } from '@mui/material';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { orderApi } from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';
import { dataGridSx } from '../theme/dataGrid';

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

  const total = data?.meta?.total ?? 0;
  const hasFilters = !!status || !!type;

  const columns: GridColDef[] = [
    {
      field: 'orderNumber', headerName: 'Order #', width: 180,
      renderCell: (p) => <Typography variant="body2" fontWeight={700}>{p.value}</Typography>,
    },
    { field: 'customer', headerName: 'Customer', flex: 1, minWidth: 160, valueGetter: (_v, row) => row.customer?.name },
    {
      field: 'type', headerName: 'Type', width: 110,
      renderCell: (p) => (
        <Chip
          size="small"
          label={p.value}
          variant="outlined"
          sx={{
            fontWeight: 700, fontSize: 11.5, height: 22,
            color: p.value === 'EXTRA' ? '#B6831A' : '#0E8C84',
            borderColor: p.value === 'EXTRA' ? 'rgba(202,138,4,0.4)' : 'rgba(14,140,132,0.4)',
            bgcolor: p.value === 'EXTRA' ? 'rgba(202,138,4,0.08)' : 'rgba(14,140,132,0.08)',
          }}
        />
      ),
    },
    { field: 'quantity', headerName: 'Qty', width: 80, align: 'center', headerAlign: 'center' },
    { field: 'orderDate', headerName: 'Date', width: 130, valueFormatter: (v) => dayjs(v).format('DD MMM YYYY') },
    {
      field: 'status', headerName: 'Status', width: 200, sortable: false,
      // One control: shows the colored status pill and lets the admin change it inline.
      renderCell: (p) => (
        <Select
          value={p.row.status}
          onChange={(e) => updateStatus.mutate({ id: p.row.id, s: e.target.value as string })}
          size="small"
          renderValue={(v) => <StatusChip status={v as string} />}
          sx={{
            width: 175,
            borderRadius: 2,
            bgcolor: 'background.paper',
            '& .MuiSelect-select': { py: 0.6, pl: 1, display: 'flex', alignItems: 'center' },
            '& fieldset': { borderColor: 'rgba(5,81,82,0.18)' },
          }}
          MenuProps={{ PaperProps: { sx: { borderRadius: 2.5, mt: 0.5 } } }}
        >
          {STATUSES.map((s) => (
            <MenuItem key={s} value={s} sx={{ py: 0.9 }}><StatusChip status={s} /></MenuItem>
          ))}
        </Select>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Orders" subtitle="Regular & extra camper orders" />

      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
            <FilterAltOutlinedIcon fontSize="small" />
            <Typography variant="subtitle2">Filters</Typography>
          </Stack>
          <TextField select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} size="small" sx={{ minWidth: 170 }}>
            <MenuItem value="">All statuses</MenuItem>
            {STATUSES.map((s) => <MenuItem key={s} value={s}><StatusChip status={s} /></MenuItem>)}
          </TextField>
          <TextField select label="Type" value={type} onChange={(e) => { setType(e.target.value); setPage(0); }} size="small" sx={{ minWidth: 150 }}>
            <MenuItem value="">All types</MenuItem>
            <MenuItem value="REGULAR">Regular</MenuItem>
            <MenuItem value="EXTRA">Extra</MenuItem>
          </TextField>
          {hasFilters && (
            <Button size="small" color="inherit" onClick={() => { setStatus(''); setType(''); setPage(0); }} sx={{ color: 'text.secondary' }}>
              Clear
            </Button>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Chip
            label={`${total} order${total === 1 ? '' : 's'}`}
            size="small"
            sx={{ fontWeight: 700, bgcolor: 'rgba(5,81,82,0.10)', color: 'primary.main' }}
          />
        </Stack>
      </Card>

      <Card>
        <DataGrid
          autoHeight rows={data?.data ?? []} columns={columns} loading={isLoading}
          rowCount={total} paginationMode="server"
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(m) => { setPage(m.page); setPageSize(m.pageSize); }}
          pageSizeOptions={[10, 20, 50]} disableRowSelectionOnClick
          rowHeight={60}
          sx={dataGridSx}
        />
      </Card>
    </Box>
  );
}
