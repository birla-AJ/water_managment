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
import { useTranslation } from 'react-i18next';

const STATUSES = ['PENDING', 'ACCEPTED', 'PROCESSING', 'DELIVERED', 'CANCELLED'];

export default function Orders() {
  const { t } = useTranslation();
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); enqueueSnackbar(t('ordersPage.updatedToast'), { variant: 'success' }); },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const total = data?.meta?.total ?? 0;
  const hasFilters = !!status || !!type;

  const columns: GridColDef[] = [
    {
      field: 'orderNumber', headerName: t('ordersPage.colOrderNo'), width: 180,
      renderCell: (p) => <Typography variant="body2" fontWeight={700}>{p.value}</Typography>,
    },
    { field: 'customer', headerName: t('ordersPage.colCustomer'), flex: 1, minWidth: 160, valueGetter: (_v, row) => row.customer?.name },
    {
      field: 'type', headerName: t('ordersPage.colType'), width: 110,
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
    { field: 'quantity', headerName: t('ordersPage.colQty'), width: 80, align: 'center', headerAlign: 'center' },
    { field: 'orderDate', headerName: t('ordersPage.colDate'), width: 130, valueFormatter: (v) => dayjs(v).format('DD MMM YYYY') },
    {
      field: 'status', headerName: t('ordersPage.colStatus'), width: 200, sortable: false,
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
      <PageHeader title={t('nav.orders')} subtitle={t('ordersPage.subtitle')} />

      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
            <FilterAltOutlinedIcon fontSize="small" />
            <Typography variant="subtitle2">{t('ordersPage.filters')}</Typography>
          </Stack>
          <TextField select label={t('common.status')} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} size="small" sx={{ minWidth: 170 }}>
            <MenuItem value="">{t('ordersPage.allStatuses')}</MenuItem>
            {STATUSES.map((s) => <MenuItem key={s} value={s}><StatusChip status={s} /></MenuItem>)}
          </TextField>
          <TextField select label={t('ordersPage.type')} value={type} onChange={(e) => { setType(e.target.value); setPage(0); }} size="small" sx={{ minWidth: 150 }}>
            <MenuItem value="">{t('ordersPage.allTypes')}</MenuItem>
            <MenuItem value="REGULAR">{t('ordersPage.regular')}</MenuItem>
            <MenuItem value="EXTRA">{t('ordersPage.extra')}</MenuItem>
          </TextField>
          {hasFilters && (
            <Button size="small" color="inherit" onClick={() => { setStatus(''); setType(''); setPage(0); }} sx={{ color: 'text.secondary' }}>
              Clear
            </Button>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Chip
            label={t('ordersPage.orderCount', { count: total })}
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
