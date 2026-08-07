import { useState } from 'react';
import {
  Box, Card, CardContent, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Tooltip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AddIcon from '@mui/icons-material/Add';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { billingApi } from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';
import { useTranslation } from 'react-i18next';

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://13.235.27.138:4000/api/v1').replace('/api/v1', '');

export default function Billing() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customerId: '', periodStart: dayjs().startOf('month').format('YYYY-MM-DD'), periodEnd: dayjs().endOf('month').format('YYYY-MM-DD') });

  const { data, isLoading } = useQuery({ queryKey: ['invoices'], queryFn: () => billingApi.list({ limit: 100 }) });

  const generate = useMutation({
    mutationFn: () => billingApi.generate(form),
    onSuccess: () => { enqueueSnackbar(t('billing.generatedToast'), { variant: 'success' }); qc.invalidateQueries({ queryKey: ['invoices'] }); setOpen(false); },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const autoGen = useMutation({
    mutationFn: (plan: string) => billingApi.autoGenerate(plan),
    onSuccess: () => { enqueueSnackbar(t('billing.bulkGeneratedToast'), { variant: 'success' }); qc.invalidateQueries({ queryKey: ['invoices'] }); },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const notify = useMutation({
    mutationFn: (id: string) => billingApi.notify(id),
    onSuccess: () => enqueueSnackbar(t('billing.notificationSentToast'), { variant: 'success' }),
  });

  // Regenerate the PDF with the latest template, then open it. Opening a blank
  // tab synchronously avoids the browser's popup blocker.
  const downloadPdf = (id: string) => {
    const win = window.open('', '_blank');
    billingApi.pdf(id)
      .then(({ pdfUrl }) => { if (win) win.location.href = `${API_BASE}${pdfUrl}`; })
      .catch((e) => { win?.close(); enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }); });
  };

  const columns: GridColDef[] = [
    { field: 'invoiceNumber', headerName: t('billing.colInvoiceNo'), width: 170 },
    { field: 'customer', headerName: t('billing.colCustomer'), flex: 1, minWidth: 140, valueGetter: (_v, row) => row.customer?.name },
    { field: 'period', headerName: t('billing.colPeriod'), width: 200, valueGetter: (_v, row) => `${dayjs(row.periodStart).format('DD MMM')} - ${dayjs(row.periodEnd).format('DD MMM')}` },
    { field: 'quantity', headerName: t('billing.colQty'), width: 70 },
    { field: 'totalAmount', headerName: t('billing.colTotal'), width: 100, valueFormatter: (v) => `₹${v}` },
    { field: 'dueAmount', headerName: t('billing.colDue'), width: 100, valueFormatter: (v) => `₹${v}` },
    { field: 'status', headerName: t('billing.colStatus'), width: 140, renderCell: (p) => <StatusChip status={p.value} /> },
    {
      field: 'actions', headerName: t('billing.colActions'), width: 120, sortable: false,
      renderCell: (p) => (
        <>
          <Tooltip title={t('billing.downloadPdfTooltip')}>
            <IconButton size="small" onClick={() => downloadPdf(p.row.id)}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('billing.sendNotificationTooltip')}>
            <IconButton size="small" onClick={() => notify.mutate(p.row.id)}><NotificationsActiveIcon fontSize="small" /></IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title={t('nav.billing')}
        subtitle={t('billing.subtitle')}
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => autoGen.mutate('MONTHLY')}>{t('billing.autoBillMonthly')}</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>{t('billing.generateInvoice')}</Button>
          </Stack>
        }
      />
      <Card>
        <DataGrid autoHeight rows={data?.data ?? []} columns={columns} loading={isLoading} disableRowSelectionOnClick pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} />
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('billing.generateInvoice')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label={t('billing.customerId')} value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} helperText={t('billing.customerIdHelper')} />
            <TextField label={t('billing.periodStart')} type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label={t('billing.periodEnd')} type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={() => generate.mutate()} disabled={generate.isPending}>{t('billing.generate')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
