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

const CATEGORIES = ['FUEL', 'VEHICLE_MAINTENANCE', 'SALARY', 'RENT', 'UTILITIES', 'SUPPLIES', 'DELIVERY', 'OTHER'];
const label = (v: string) => v.split('_').map((x) => x[0] + x.slice(1).toLowerCase()).join(' ');

export default function Expenses() {
  const qc = useQueryClient(); const { enqueueSnackbar } = useSnackbar();
  const [period, setPeriod] = useState('month'); const [category, setCategory] = useState(''); const [search, setSearch] = useState('');
  const [page, setPage] = useState(0); const [pageSize, setPageSize] = useState(20); const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'OTHER', amount: '', expenseDate: dayjs().format('YYYY-MM-DD'), paymentMode: 'CASH', notes: '' });
  const query = { period, category: category || undefined, search: search || undefined, page: page + 1, limit: pageSize };
  const { data, isLoading } = useQuery({ queryKey: ['expenses', query], queryFn: () => expenseApi.list(query) });
  const create = useMutation({ mutationFn: () => expenseApi.create({ ...form, amount: Number(form.amount) }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setOpen(false); enqueueSnackbar('Expense added', { variant: 'success' }); }, onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }) });
  const remove = useMutation({ mutationFn: expenseApi.remove, onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); enqueueSnackbar('Expense deleted', { variant: 'success' }); }, onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }) });
  const download = async () => { try { const r = await expenseApi.exportExcel({ period, category: category || undefined }); const url = URL.createObjectURL(r.data); const a = document.createElement('a'); a.href = url; a.download = 'waterflow-expenses.xlsx'; a.click(); URL.revokeObjectURL(url); } catch (e) { enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }); } };
  const columns: GridColDef[] = [
    { field: 'expenseDate', headerName: 'Date', width: 115, valueFormatter: (v) => dayjs(v).format('DD MMM YYYY') },
    { field: 'title', headerName: 'Expense', flex: 1, minWidth: 170 },
    { field: 'category', headerName: 'Category', width: 155, valueFormatter: (v) => label(v) },
    { field: 'paymentMode', headerName: 'Paid via', width: 110 },
    { field: 'amount', headerName: 'Amount', width: 125, align: 'right', headerAlign: 'right', renderCell: (p) => <Typography fontWeight={800}>₹{Number(p.value).toLocaleString('en-IN')}</Typography> },
    { field: 'actions', headerName: '', width: 70, sortable: false, renderCell: (p) => <Button color="error" size="small" onClick={() => remove.mutate(p.row.id)}><DeleteOutlineIcon fontSize="small" /></Button> },
  ];
  return <Box>
    <PageHeader title="Expenses" subtitle="Track and review your business spending" action={<Stack direction="row" spacing={1}><Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={download}>Export Excel</Button><Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Add Expense</Button></Stack>} />
    <Card sx={{ p: 2, mb: 2 }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}><TextField select label="Period" value={period} onChange={(e) => { setPeriod(e.target.value); setPage(0); }} size="small" sx={{ minWidth: 145 }}>{[['day','Today'],['week','This week'],['month','This month'],['year','This year'],['all','All time']].map(([v,l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField><TextField select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} size="small" sx={{ minWidth: 170 }}><MenuItem value="">All categories</MenuItem>{CATEGORIES.map((v) => <MenuItem key={v} value={v}>{label(v)}</MenuItem>)}</TextField><TextField label="Search expense" value={search} onChange={(e) => setSearch(e.target.value)} size="small" sx={{ minWidth: 220 }} /></Stack></Card>
    <Card sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Box><Typography variant="overline" color="text.secondary">Total expense</Typography><Typography variant="h4">₹{Number(data?.data?.totalAmount ?? 0).toLocaleString('en-IN')}</Typography></Box><Typography color="text.secondary">{period === 'all' ? 'All recorded expenses' : `For this ${period}`}</Typography></Card>
    <Card><DataGrid autoHeight rows={data?.data?.items ?? []} columns={columns} loading={isLoading} rowCount={data?.meta?.total ?? 0} paginationMode="server" paginationModel={{ page, pageSize }} onPaginationModelChange={(m) => { setPage(m.page); setPageSize(m.pageSize); }} pageSizeOptions={[10,20,50]} disableRowSelectionOnClick /></Card>
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Add Expense</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField label="Expense title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}/><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField select fullWidth label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((v) => <MenuItem key={v} value={v}>{label(v)}</MenuItem>)}</TextField><TextField fullWidth label="Amount" type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}/></Stack><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField fullWidth label="Date" type="date" InputLabelProps={{ shrink: true }} value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}/><TextField select fullWidth label="Payment mode" value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>{['CASH','UPI','CARD'].map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField></Stack><TextField label="Notes (optional)" multiline rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></Stack></DialogContent><DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" disabled={!form.title || !Number(form.amount) || create.isPending} onClick={() => create.mutate()}>Save Expense</Button></DialogActions></Dialog>
  </Box>;
}
