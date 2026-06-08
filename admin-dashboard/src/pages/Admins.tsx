import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, MenuItem, Stack, TextField, Tooltip, InputAdornment, Link,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
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
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const me = useAppSelector((s) => s.auth.user);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();

  const { data, isLoading } = useQuery({ queryKey: ['admins'], queryFn: () => adminApi.list({ limit: 100 }) });

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
    {
      field: 'name', headerName: 'Name', flex: 1, minWidth: 150,
      renderCell: (p) => (
        <Link component="button" underline="hover" onClick={() => navigate(`/admins/${p.row.id}`)} sx={{ fontWeight: 700 }}>
          {p.value}
        </Link>
      ),
    },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    { field: 'mobile', headerName: 'Mobile', width: 130, valueFormatter: (v) => v ?? '—' },
    { field: 'role', headerName: 'Role', width: 140, renderCell: (p) => <StatusChip status={p.value === 'SUPER_ADMIN' ? 'PROCESSING' : 'ACTIVE'} /> },
    { field: 'isActive', headerName: 'Active', width: 110, renderCell: (p) => <StatusChip status={p.value === false ? 'INACTIVE' : 'ACTIVE'} /> },
    {
      field: 'customers', headerName: 'Customers', width: 120, sortable: false,
      renderCell: (p) => (
        <Link component="button" underline="hover" onClick={() => navigate(`/admins/${p.row.id}`)} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
          <PeopleIcon fontSize="small" /> {p.row._count?.customers ?? 0}
        </Link>
      ),
    },
    { field: 'lastLoginAt', headerName: 'Last Login', width: 160, valueFormatter: (v) => (v ? dayjs(v).format('DD MMM YYYY HH:mm') : 'Never') },
    {
      field: 'actions', headerName: 'Actions', width: 140, sortable: false,
      renderCell: (p) => (
        <>
          <Tooltip title="View details">
            <IconButton size="small" onClick={() => navigate(`/admins/${p.row.id}`)}><VisibilityIcon fontSize="small" /></IconButton>
          </Tooltip>
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
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Name" fullWidth {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'At least 2 characters' } })}
                  error={!!errors.name} helperText={errors.name?.message} InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email" type="email" fullWidth disabled={!!editId}
                  {...register('email', editId ? {} : { required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' } })}
                  error={!!errors.email} helperText={errors.email?.message} InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label={editId ? 'New Password (optional)' : 'Password'} type="password" fullWidth
                  {...register('password', {
                    ...(editId ? {} : { required: 'Password is required' }),
                    validate: (v) => (!v || v.length >= 6 ? true : 'At least 6 characters'),
                  })}
                  error={!!errors.password} helperText={errors.password?.message} InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Mobile (for OTP login)" fullWidth
                  {...register('mobile', { pattern: { value: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit mobile' } })}
                  error={!!errors.mobile} helperText={errors.mobile?.message}
                  InputProps={{ startAdornment: <InputAdornment position="start">+91</InputAdornment> }}
                  inputProps={{ maxLength: 10, inputMode: 'numeric' }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
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
    </Box>
  );
}
