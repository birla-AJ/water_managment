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

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1').replace('/api/v1', '');

export default function Billing() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customerId: '', periodStart: dayjs().startOf('month').format('YYYY-MM-DD'), periodEnd: dayjs().endOf('month').format('YYYY-MM-DD') });

  const { data, isLoading } = useQuery({ queryKey: ['invoices'], queryFn: () => billingApi.list({ limit: 100 }) });

  const generate = useMutation({
    mutationFn: () => billingApi.generate(form),
    onSuccess: () => { enqueueSnackbar('Invoice generated', { variant: 'success' }); qc.invalidateQueries({ queryKey: ['invoices'] }); setOpen(false); },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const autoGen = useMutation({
    mutationFn: (plan: string) => billingApi.autoGenerate(plan),
    onSuccess: () => { enqueueSnackbar('Bulk invoices generated', { variant: 'success' }); qc.invalidateQueries({ queryKey: ['invoices'] }); },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const notify = useMutation({
    mutationFn: (id: string) => billingApi.notify(id),
    onSuccess: () => enqueueSnackbar('Notification sent', { variant: 'success' }),
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
    { field: 'invoiceNumber', headerName: 'Invoice #', width: 170 },
    { field: 'customer', headerName: 'Customer', flex: 1, minWidth: 140, valueGetter: (_v, row) => row.customer?.name },
    { field: 'period', headerName: 'Period', width: 200, valueGetter: (_v, row) => `${dayjs(row.periodStart).format('DD MMM')} - ${dayjs(row.periodEnd).format('DD MMM')}` },
    { field: 'quantity', headerName: 'Qty', width: 70 },
    { field: 'totalAmount', headerName: 'Total', width: 100, valueFormatter: (v) => `₹${v}` },
    { field: 'dueAmount', headerName: 'Due', width: 100, valueFormatter: (v) => `₹${v}` },
    { field: 'status', headerName: 'Status', width: 140, renderCell: (p) => <StatusChip status={p.value} /> },
    {
      field: 'actions', headerName: 'Actions', width: 120, sortable: false,
      renderCell: (p) => (
        <>
          <Tooltip title="Download / open PDF">
            <IconButton size="small" onClick={() => downloadPdf(p.row.id)}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Send notification">
            <IconButton size="small" onClick={() => notify.mutate(p.row.id)}><NotificationsActiveIcon fontSize="small" /></IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Billing"
        subtitle="Invoices & automatic billing"
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => autoGen.mutate('MONTHLY')}>Auto-bill Monthly</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Generate Invoice</Button>
          </Stack>
        }
      />
      <Card>
        <DataGrid autoHeight rows={data?.data ?? []} columns={columns} loading={isLoading} disableRowSelectionOnClick pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} />
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Generate Invoice</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Customer ID" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} helperText="Paste a customerfor tedt adddd  UUID (from Customers page)" />
            <TextField label="Period Start" type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="Period End" type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => generate.mutate()} disabled={generate.isPending}>Generate</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
