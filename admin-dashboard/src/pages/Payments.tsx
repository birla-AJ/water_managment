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
import { useTranslation } from 'react-i18next';

const STATUSES = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'];

export default function Payments() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['payments', status], queryFn: () => paymentApi.list({ status: status || undefined, limit: 100 }) });

  const refund = useMutation({
    mutationFn: (id: string) => paymentApi.refund(id),
    onSuccess: () => { enqueueSnackbar(t('payments.refundedToast'), { variant: 'success' }); qc.invalidateQueries({ queryKey: ['payments'] }); },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const columns: GridColDef[] = [
    { field: 'createdAt', headerName: t('payments.colDate'), width: 160, valueFormatter: (v) => dayjs(v).format('DD MMM YYYY HH:mm') },
    { field: 'customer', headerName: t('payments.colCustomer'), flex: 1, minWidth: 140, valueGetter: (_v, row) => row.customer?.name },
    { field: 'invoice', headerName: t('payments.colInvoice'), width: 160, valueGetter: (_v, row) => row.invoice?.invoiceNumber ?? '—' },
    { field: 'amount', headerName: t('payments.colAmount'), width: 110, valueFormatter: (v) => `₹${v}` },
    { field: 'method', headerName: t('payments.colMethod'), width: 110 },
    { field: 'status', headerName: t('payments.colStatus'), width: 120, renderCell: (p) => <StatusChip status={p.value} /> },
    {
      field: 'actions', headerName: t('payments.colActions'), width: 120, sortable: false,
      renderCell: (p) => p.row.status === 'SUCCESS' ? <Button size="small" color="warning" onClick={() => refund.mutate(p.row.id)}>{t('payments.refund')}</Button> : null,
    },
  ];

  return (
    <Box>
      <PageHeader title={t('nav.payments')} subtitle={t('payments.subtitle')} />
      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2}>
          <TextField select label={t('payments.status')} value={status} onChange={(e) => setStatus(e.target.value)} size="small" sx={{ minWidth: 160 }}>
            <MenuItem value="">{t('common.all')}</MenuItem>{STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
        </Stack>
      </Card>
      <Card>
        <DataGrid autoHeight rows={data?.data ?? []} columns={columns} loading={isLoading} disableRowSelectionOnClick pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} />
      </Card>
    </Box>
  );
}
