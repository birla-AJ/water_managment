import { useState } from 'react';
import { Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { expenseApi } from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import { useTranslation } from 'react-i18next';

const CATEGORIES = ['FUEL', 'VEHICLE_MAINTENANCE', 'SALARY', 'RENT', 'UTILITIES', 'SUPPLIES', 'DELIVERY', 'OTHER'];
const label = (v: string) => v.split('_').map((x) => x[0] + x.slice(1).toLowerCase()).join(' ');

export default function Expenses() {
  const { t } = useTranslation();
  const qc = useQueryClient(); const { enqueueSnackbar } = useSnackbar();
  const [period, setPeriod] = useState('month'); const [category, setCategory] = useState(''); const [search, setSearch] = useState('');
  const [page, setPage] = useState(0); const [pageSize, setPageSize] = useState(20); const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'OTHER', amount: '', expenseDate: dayjs().format('YYYY-MM-DD'), paymentMode: 'CASH', notes: '' });
  const query = { period, category: category || undefined, search: search || undefined, page: page + 1, limit: pageSize };
  const { data, isLoading } = useQuery({ queryKey: ['expenses', query], queryFn: () => expenseApi.list(query) });
  const create = useMutation({ mutationFn: () => expenseApi.create({ ...form, amount: Number(form.amount) }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setOpen(false); enqueueSnackbar(t('expenses.addedToast'), { variant: 'success' }); }, onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }) });
  const remove = useMutation({ mutationFn: expenseApi.remove, onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); enqueueSnackbar(t('expenses.deletedToast'), { variant: 'success' }); }, onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }) });
  const download = async () => { try { const r = await expenseApi.exportExcel({ period, category: category || undefined }); const url = URL.createObjectURL(r.data); const a = document.createElement('a'); a.href = url; a.download = 'waterflow-expenses.xlsx'; a.click(); URL.revokeObjectURL(url); } catch (e) { enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }); } };
  const columns: GridColDef[] = [
    { field: 'expenseDate', headerName: t('expenses.colDate'), width: 115, valueFormatter: (v) => dayjs(v).format('DD MMM YYYY') },
    { field: 'title', headerName: t('expenses.colExpense'), flex: 1, minWidth: 170 },
    { field: 'category', headerName: t('expenses.colCategory'), width: 155, valueFormatter: (v) => label(v) },
    { field: 'paymentMode', headerName: t('expenses.colPaidVia'), width: 110 },
    { field: 'amount', headerName: t('expenses.colAmount'), width: 125, align: 'right', headerAlign: 'right', renderCell: (p) => <Typography fontWeight={800}>₹{Number(p.value).toLocaleString('en-IN')}</Typography> },
    { field: 'actions', headerName: '', width: 70, sortable: false, renderCell: (p) => <Button color="error" size="small" onClick={() => remove.mutate(p.row.id)}><DeleteOutlineIcon fontSize="small" /></Button> },
  ];
  return <Box>
    <PageHeader title={t('nav.expenses')} subtitle={t('expenses.subtitle')} action={<Stack direction="row" spacing={1}><Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={download}>{t('expenses.exportExcel')}</Button><Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>{t('expenses.addExpense')}</Button></Stack>} />
    <Card sx={{ p: 2, mb: 2 }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}><TextField select label={t('expenses.period')} value={period} onChange={(e) => { setPeriod(e.target.value); setPage(0); }} size="small" sx={{ minWidth: 145 }}>{[['day', t('expenses.periodDay')],['week', t('expenses.periodWeek')],['month', t('expenses.periodMonth')],['year', t('expenses.periodYear')],['all', t('expenses.periodAll')]].map(([v,l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField><TextField select label={t('expenses.category')} value={category} onChange={(e) => setCategory(e.target.value)} size="small" sx={{ minWidth: 170 }}><MenuItem value="">{t('expenses.allCategories')}</MenuItem>{CATEGORIES.map((v) => <MenuItem key={v} value={v}>{label(v)}</MenuItem>)}</TextField><TextField label={t('expenses.searchExpense')} value={search} onChange={(e) => setSearch(e.target.value)} size="small" sx={{ minWidth: 220 }} /></Stack></Card>
    <Card sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Box><Typography variant="overline" color="text.secondary">{t('expenses.totalExpense')}</Typography><Typography variant="h4">₹{Number(data?.data?.totalAmount ?? 0).toLocaleString('en-IN')}</Typography></Box><Typography color="text.secondary">{period === 'all' ? t('expenses.allRecordedExpenses') : t('expenses.forThisPeriod', { period })}</Typography></Card>
    <Card><DataGrid autoHeight rows={data?.data?.items ?? []} columns={columns} loading={isLoading} rowCount={data?.meta?.total ?? 0} paginationMode="server" paginationModel={{ page, pageSize }} onPaginationModelChange={(m) => { setPage(m.page); setPageSize(m.pageSize); }} pageSizeOptions={[10,20,50]} disableRowSelectionOnClick /></Card>
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm"><DialogTitle>{t('expenses.dialogTitle')}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField label={t('expenses.expenseTitle')} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}/><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField select fullWidth label={t('expenses.category')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((v) => <MenuItem key={v} value={v}>{label(v)}</MenuItem>)}</TextField><TextField fullWidth label={t('expenses.amount')} type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}/></Stack><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField fullWidth label={t('expenses.date')} type="date" InputLabelProps={{ shrink: true }} value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}/><TextField select fullWidth label={t('expenses.paymentMode')} value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>{['CASH','UPI','CARD'].map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField></Stack><TextField label={t('expenses.notesOptional')} multiline rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></Stack></DialogContent><DialogActions><Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button variant="contained" disabled={!form.title || !Number(form.amount) || create.isPending} onClick={() => create.mutate()}>{t('expenses.saveExpense')}</Button></DialogActions></Dialog>
  </Box>;
}
