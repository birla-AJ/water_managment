import { useState } from 'react';
import {
  Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, MenuItem, Stack, TextField, Tooltip,
  List, ListItem, ListItemText, Chip, CircularProgress, Typography, Link,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { adminApi } from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import { useAppSelector } from '../app/hooks';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';
import type { Admin } from '../types';

interface FormValues {
  name: string;
  email: string;
  password: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  phone?: string;
  mobile?: string;
  isActive: 'true' | 'false';
}

export default function Admins() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const me = useAppSelector((s) => s.auth.user);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<FormValues>();

  const { data, isLoading } = useQuery({ queryKey: ['admins'], queryFn: () => adminApi.list({ limit: 100 }) });

  // "View customers" dialog — the customers each admin created/manages.
  const [viewAdmin, setViewAdmin] = useState<Admin | null>(null);
  const { data: adminCustomers, isLoading: custLoading } = useQuery({
    queryKey: ['admin-customers', viewAdmin?.id],
    queryFn: () => adminApi.customers(viewAdmin!.id),
    enabled: !!viewAdmin,
  });

  const openCreate = () => {
    setEditId(null);
    reset({ name: '', email: '', password: '', role: 'ADMIN', phone: '', mobile: '', isActive: 'true' });
    setOpen(true);
  };
  const openEdit = (a: Admin) => {
    setEditId(a.id);
    reset({ name: a.name, email: a.email, password: '', role: a.role, phone: a.phone ?? '', mobile: a.mobile ?? '', isActive: a.isActive === false ? 'false' : 'true' });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const base = {
        name: v.name,
        role: v.role,
        phone: v.phone || undefined,
        mobile: v.mobile || undefined,
        isActive: v.isActive === 'true',
      };
      if (editId) {
        // Only send a password when one was typed.
        return adminApi.update(editId, { ...base, ...(v.password ? { password: v.password } : {}) });
      }
      return adminApi.create({ ...base, email: v.email, password: v.password });
    },
    onSuccess: () => {
      enqueueSnackbar(`Admin ${editId ? 'updated' : 'created'}`, { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['admins'] });
      setOpen(false);
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const del = useMutation({
    mutationFn: (id: string) => adminApi.remove(id),
    onSuccess: () => { enqueueSnackbar('Admin deleted', { variant: 'success' }); qc.invalidateQueries({ queryKey: ['admins'] }); },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    { field: 'mobile', headerName: 'Mobile', width: 130, valueFormatter: (v) => v ?? '—' },
    { field: 'role', headerName: 'Role', width: 140, renderCell: (p) => <StatusChip status={p.value === 'SUPER_ADMIN' ? 'PROCESSING' : 'ACTIVE'} /> },
    { field: 'isActive', headerName: 'Active', width: 110, renderCell: (p) => <StatusChip status={p.value === false ? 'INACTIVE' : 'ACTIVE'} /> },
    {
      field: 'customers', headerName: 'Customers', width: 120, sortable: false,
      renderCell: (p) => (
        <Link component="button" underline="hover" onClick={() => setViewAdmin(p.row)} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
          <PeopleIcon fontSize="small" /> {p.row._count?.customers ?? 0}
        </Link>
      ),
    },
    { field: 'lastLoginAt', headerName: 'Last Login', width: 160, valueFormatter: (v) => (v ? dayjs(v).format('DD MMM YYYY HH:mm') : 'Never') },
    {
      field: 'actions', headerName: 'Actions', width: 110, sortable: false,
      renderCell: (p) => (
        <>
          <IconButton size="small" onClick={() => openEdit(p.row)}><EditIcon fontSize="small" /></IconButton>
          <Tooltip title={p.row.id === me?.id ? 'You cannot delete yourself' : 'Delete'}>
            <span>
              <IconButton size="small" disabled={p.row.id === me?.id} onClick={() => del.mutate(p.row.id)}><DeleteIcon fontSize="small" /></IconButton>
            </span>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Admins"
        subtitle="Manage admin & super-admin accounts"
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add Admin</Button>}
      />
      <Card>
        <DataGrid
          autoHeight
          rows={data?.data ?? []}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        />
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editId ? 'Edit Admin' : 'Add Admin'}</DialogTitle>
        <form onSubmit={handleSubmit((v) => save.mutate(v))}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0 }}>
              <Grid item xs={12} sm={6}><TextField label="Name" fullWidth required {...register('name')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Email" type="email" fullWidth required disabled={!!editId} {...register('email')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={editId ? 'New Password (optional)' : 'Password'} type="password" fullWidth required={!editId} {...register('password')} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6}><TextField label="Mobile (for OTP login)" fullWidth {...register('mobile')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Phone" fullWidth {...register('phone')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={6}>
                <TextField select label="Role" fullWidth defaultValue="ADMIN" {...register('role')} InputLabelProps={{ shrink: true }}>
                  <MenuItem value="ADMIN">Admin</MenuItem>
                  <MenuItem value="SUPER_ADMIN">Super Admin</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select label="Active" fullWidth defaultValue="true" {...register('isActive')} InputLabelProps={{ shrink: true }}>
                  <MenuItem value="true">Yes</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Stack><Button type="submit" variant="contained" disabled={save.isPending}>{editId ? 'Update' : 'Create'}</Button></Stack>
          </DialogActions>
        </form>
      </Dialog>

      {/* View an admin's customers */}
      <Dialog open={!!viewAdmin} onClose={() => setViewAdmin(null)} fullWidth maxWidth="sm">
        <DialogTitle>Customers of {viewAdmin?.name}</DialogTitle>
        <DialogContent>
          {custLoading ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (adminCustomers ?? []).length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 3 }}>This admin hasn't created any customers yet.</Typography>
          ) : (
            <List dense sx={{ maxHeight: 420, overflow: 'auto' }}>
              {(adminCustomers ?? []).map((c) => (
                <ListItem key={c.id} divider secondaryAction={<StatusChip status={c.status} />}>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span>{c.name}</span>
                        <Chip size="small" label={c.customerType} />
                        {c.isPaused && <Chip size="small" color="warning" label="Paused" />}
                      </Stack>
                    }
                    secondary={`${c.mobile}${c.area ? ` · ${c.area}` : ''} · ${c.allocatedCampers} campers`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewAdmin(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
