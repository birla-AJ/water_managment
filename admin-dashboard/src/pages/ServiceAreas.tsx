import { useState } from 'react';
import {
  Box, Button, Card, Dialog, DialogActions, DialogContent, Grid, IconButton,
  TextField, Tooltip, Typography, Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { serviceAreaApi } from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import { dataGridSx } from '../theme/dataGrid';
import { BRAND_GRADIENT, BRAND_GRADIENT_SOFT } from '../theme/theme';
import type { ServiceArea } from '../types';

interface FormValues {
  name: string;
  city?: string;
  pincode?: string;
  latitude?: string;
  longitude?: string;
}

export default function ServiceAreas() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>();

  const { data, isLoading } = useQuery({ queryKey: ['service-areas'], queryFn: serviceAreaApi.list });

  const openCreate = () => {
    setEditId(null);
    reset({ name: '', city: '', pincode: '', latitude: '', longitude: '' });
    setOpen(true);
  };
  const openEdit = (a: ServiceArea) => {
    setEditId(a.id);
    reset({
      name: a.name, city: a.city ?? '', pincode: a.pincode ?? '',
      latitude: a.latitude != null ? String(a.latitude) : '',
      longitude: a.longitude != null ? String(a.longitude) : '',
    });
    setOpen(true);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { enqueueSnackbar('Geolocation not supported', { variant: 'warning' }); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('latitude', pos.coords.latitude.toFixed(6));
        setValue('longitude', pos.coords.longitude.toFixed(6));
        enqueueSnackbar('Location captured', { variant: 'success' });
      },
      () => enqueueSnackbar('Could not get your location', { variant: 'error' }),
    );
  };

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const body = {
        name: v.name,
        city: v.city || undefined,
        pincode: v.pincode || undefined,
        latitude: v.latitude ? Number(v.latitude) : undefined,
        longitude: v.longitude ? Number(v.longitude) : undefined,
      };
      return editId ? serviceAreaApi.update(editId, body) : serviceAreaApi.create(body);
    },
    onSuccess: () => {
      enqueueSnackbar(`Service area ${editId ? 'updated' : 'created'}`, { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['service-areas'] });
      setOpen(false);
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const del = useMutation({
    mutationFn: (id: string) => serviceAreaApi.remove(id),
    onSuccess: () => { enqueueSnackbar('Service area deleted', { variant: 'success' }); qc.invalidateQueries({ queryKey: ['service-areas'] }); },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Area', flex: 1, minWidth: 160, renderCell: (p) => <Typography variant="body2" fontWeight={700}>{p.value}</Typography> },
    { field: 'city', headerName: 'City', flex: 1, minWidth: 130, valueFormatter: (v) => v || '—' },
    { field: 'pincode', headerName: 'Pincode', width: 110, valueFormatter: (v) => v || '—' },
    {
      field: 'gps', headerName: 'GPS', width: 110, sortable: false,
      valueGetter: (_v, row) => (row.latitude != null && row.longitude != null ? '✓' : '—'),
    },
    { field: '_count', headerName: 'Distributors', width: 130, valueGetter: (_v, row) => row._count?.admins ?? 0 },
    {
      field: 'actions', headerName: 'Actions', width: 110, sortable: false,
      renderCell: (p) => (
        <>
          <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(p.row)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => del.mutate(p.row.id)} sx={{ '&:hover': { color: 'error.main', bgcolor: 'rgba(211,47,47,0.10)' } }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Service Areas"
        subtitle="Master list of localities distributors can serve"
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add Area</Button>}
      />
      <Card>
        <DataGrid
          autoHeight rows={data ?? []} columns={columns} loading={isLoading}
          disableRowSelectionOnClick pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          rowHeight={56} sx={dataGridSx}
        />
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 2.25, background: BRAND_GRADIENT_SOFT, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ background: BRAND_GRADIENT, color: '#FFFFFF', width: 44, height: 44, borderRadius: 2.5, display: 'grid', placeItems: 'center', boxShadow: '0 8px 18px -6px rgba(5,81,82,0.5)' }}>
            <PlaceOutlinedIcon />
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} lineHeight={1.15}>{editId ? 'Edit Service Area' : 'Add Service Area'}</Typography>
            <Typography variant="caption" color="text.secondary">A locality distributors can be assigned to</Typography>
          </Box>
          <IconButton onClick={() => setOpen(false)} size="small"><CloseIcon fontSize="small" /></IconButton>
        </Box>
        <form onSubmit={handleSubmit((v) => save.mutate(v))}>
          <DialogContent sx={{ p: 3 }}>
            <Grid container spacing={2.25} sx={{ mt: 0 }}>
              <Grid item xs={12} sm={6}>
                <TextField label="Area name" fullWidth {...register('name', { required: 'Name is required' })} error={!!errors.name} helperText={errors.name?.message} InputLabelProps={{ shrink: true }} placeholder="Limbodi" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="City" fullWidth {...register('city')} InputLabelProps={{ shrink: true }} placeholder="Indore" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Pincode" fullWidth {...register('pincode', { pattern: { value: /^\d{6}$/, message: 'Enter a valid 6-digit pincode' } })} error={!!errors.pincode} helperText={errors.pincode?.message} InputLabelProps={{ shrink: true }} inputProps={{ maxLength: 6, inputMode: 'numeric' }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button size="small" startIcon={<MyLocationIcon fontSize="small" />} onClick={detectLocation} sx={{ mt: 1 }}>Use my location</Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Latitude" fullWidth {...register('latitude')} InputLabelProps={{ shrink: true }} inputProps={{ inputMode: 'decimal' }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Longitude" fullWidth {...register('longitude')} InputLabelProps={{ shrink: true }} inputProps={{ inputMode: 'decimal' }} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.75, pt: 0 }}>
            <Button onClick={() => setOpen(false)} color="inherit" sx={{ color: 'text.secondary' }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={save.isPending} startIcon={editId ? <CheckIcon /> : <AddIcon />}>
              {save.isPending ? 'Saving…' : editId ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
