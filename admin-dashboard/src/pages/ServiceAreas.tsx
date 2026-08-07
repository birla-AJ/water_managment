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
import { useTranslation } from 'react-i18next';

interface FormValues {
  name: string;
  city?: string;
  pincode?: string;
  latitude?: string;
  longitude?: string;
}

export default function ServiceAreas() {
  const { t } = useTranslation();
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
    if (!navigator.geolocation) { enqueueSnackbar(t('serviceAreas.geoNotSupported'), { variant: 'warning' }); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('latitude', pos.coords.latitude.toFixed(6));
        setValue('longitude', pos.coords.longitude.toFixed(6));
        enqueueSnackbar(t('serviceAreas.locationCaptured'), { variant: 'success' });
      },
      () => enqueueSnackbar(t('serviceAreas.locationFailed'), { variant: 'error' }),
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
      enqueueSnackbar(editId ? t('serviceAreas.updatedToast') : t('serviceAreas.createdToast'), { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['service-areas'] });
      setOpen(false);
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const del = useMutation({
    mutationFn: (id: string) => serviceAreaApi.remove(id),
    onSuccess: () => { enqueueSnackbar(t('serviceAreas.deletedToast'), { variant: 'success' }); qc.invalidateQueries({ queryKey: ['service-areas'] }); },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const columns: GridColDef[] = [
    { field: 'name', headerName: t('serviceAreas.colArea'), flex: 1, minWidth: 160, renderCell: (p) => <Typography variant="body2" fontWeight={700}>{p.value}</Typography> },
    { field: 'city', headerName: t('serviceAreas.colCity'), flex: 1, minWidth: 130, valueFormatter: (v) => v || '—' },
    { field: 'pincode', headerName: t('serviceAreas.colPincode'), width: 110, valueFormatter: (v) => v || '—' },
    {
      field: 'gps', headerName: t('serviceAreas.colGps'), width: 110, sortable: false,
      valueGetter: (_v, row) => (row.latitude != null && row.longitude != null ? '✓' : '—'),
    },
    { field: '_count', headerName: t('serviceAreas.colDistributors'), width: 130, valueGetter: (_v, row) => row._count?.admins ?? 0 },
    {
      field: 'actions', headerName: t('serviceAreas.colActions'), width: 110, sortable: false,
      renderCell: (p) => (
        <>
          <Tooltip title={t('serviceAreas.edit')}><IconButton size="small" onClick={() => openEdit(p.row)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title={t('serviceAreas.delete')}>
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
        title={t('nav.serviceAreas')}
        subtitle={t('serviceAreas.subtitle')}
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>{t('serviceAreas.addArea')}</Button>}
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
            <Typography variant="h6" fontWeight={800} lineHeight={1.15}>{editId ? t('serviceAreas.editArea') : t('serviceAreas.addAreaTitle')}</Typography>
            <Typography variant="caption" color="text.secondary">{t('serviceAreas.dialogSubtitle')}</Typography>
          </Box>
          <IconButton onClick={() => setOpen(false)} size="small"><CloseIcon fontSize="small" /></IconButton>
        </Box>
        <form onSubmit={handleSubmit((v) => save.mutate(v))}>
          <DialogContent sx={{ p: 3 }}>
            <Grid container spacing={2.25} sx={{ mt: 0 }}>
              <Grid item xs={12} sm={6}>
                <TextField label={t('serviceAreas.areaName')} fullWidth {...register('name', { required: t('serviceAreas.nameRequired') })} error={!!errors.name} helperText={errors.name?.message} InputLabelProps={{ shrink: true }} placeholder="Limbodi" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('serviceAreas.city')} fullWidth {...register('city')} InputLabelProps={{ shrink: true }} placeholder="Indore" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('serviceAreas.pincode')} fullWidth {...register('pincode', { pattern: { value: /^\d{6}$/, message: t('serviceAreas.invalidPincode') } })} error={!!errors.pincode} helperText={errors.pincode?.message} InputLabelProps={{ shrink: true }} inputProps={{ maxLength: 6, inputMode: 'numeric' }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button size="small" startIcon={<MyLocationIcon fontSize="small" />} onClick={detectLocation} sx={{ mt: 1 }}>{t('serviceAreas.useMyLocation')}</Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('serviceAreas.latitude')} fullWidth {...register('latitude')} InputLabelProps={{ shrink: true }} inputProps={{ inputMode: 'decimal' }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('serviceAreas.longitude')} fullWidth {...register('longitude')} InputLabelProps={{ shrink: true }} inputProps={{ inputMode: 'decimal' }} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.75, pt: 0 }}>
            <Button onClick={() => setOpen(false)} color="inherit" sx={{ color: 'text.secondary' }}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={save.isPending} startIcon={editId ? <CheckIcon /> : <AddIcon />}>
              {save.isPending ? t('common.saving') : editId ? t('common.update') : t('common.create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
