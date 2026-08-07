import { useState } from 'react';
import {
  Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, MenuItem, Stack, TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { vehicleApi } from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';
import type { Vehicle } from '../types';
import { useTranslation } from 'react-i18next';

type FormValues = Partial<Vehicle>;

export default function Vehicles({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', page, pageSize],
    queryFn: () => vehicleApi.list({ page: page + 1, limit: pageSize }),
  });

  const openCreate = () => { setEditId(null); reset({ number: '', type: '', isActive: true }); setOpen(true); };
  const openEdit = (v: Vehicle) => { setEditId(v.id); reset(v); setOpen(true); };

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = { ...values, capacity: values.capacity ? Number(values.capacity) : undefined };
      return editId ? vehicleApi.update(editId, payload) : vehicleApi.create(payload);
    },
    onSuccess: () => {
      enqueueSnackbar(editId ? t('vehicles.updatedToast') : t('vehicles.createdToast'), { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      setOpen(false);
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const del = useMutation({
    mutationFn: (id: string) => vehicleApi.remove(id),
    onSuccess: () => { enqueueSnackbar(t('vehicles.deletedToast'), { variant: 'success' }); qc.invalidateQueries({ queryKey: ['vehicles'] }); },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const columns: GridColDef[] = [
    { field: 'number', headerName: t('vehicles.colNumber'), flex: 1, minWidth: 140 },
    { field: 'type', headerName: t('vehicles.colType'), width: 130 },
    { field: 'capacity', headerName: t('vehicles.colCapacity'), width: 100 },
    {
      field: 'driver', headerName: t('vehicles.colAssignedTo'), flex: 1, minWidth: 160,
      renderCell: (p) => (p.value ? `${p.value.name} (${p.value.mobile})` : '—'),
    },
    { field: 'isActive', headerName: t('vehicles.colActive'), width: 100, renderCell: (p) => <StatusChip status={p.value ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      field: 'actions', headerName: t('vehicles.colActions'), width: 110, sortable: false,
      renderCell: (p) => (
        <>
          <IconButton size="small" onClick={() => openEdit(p.row)}><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => del.mutate(p.row.id)}><DeleteIcon fontSize="small" /></IconButton>
        </>
      ),
    },
  ];

  return (
    <Box>
      {!embedded && (
        <PageHeader
          title={t('nav.driversVehicles')}
          subtitle={t('vehicles.subtitle')}
          action={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>{t('vehicles.addVehicle')}</Button>}
        />
      )}
      {embedded && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>{t('vehicles.addVehicle')}</Button>
        </Box>
      )}
      <Card>
        <DataGrid
          autoHeight
          rows={data?.data ?? []}
          columns={columns}
          loading={isLoading}
          rowCount={data?.meta?.total ?? 0}
          paginationMode="server"
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(m) => { setPage(m.page); setPageSize(m.pageSize); }}
          pageSizeOptions={[10, 20, 50]}
          disableRowSelectionOnClick
        />
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editId ? t('vehicles.editVehicle') : t('vehicles.addVehicle')}</DialogTitle>
        <form onSubmit={handleSubmit((v) => save.mutate(v))}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0 }}>
              <Grid item xs={12} sm={6}>
                <TextField label={t('vehicles.vehicleNumber')} fullWidth {...register('number', { required: t('vehicles.vehicleNumberRequired') })}
                  error={!!errors.number} helperText={errors.number?.message} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6}><TextField label={t('vehicles.typePlaceholder')} fullWidth {...register('type')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={6}><TextField label={t('vehicles.capacityCampers')} type="number" fullWidth {...register('capacity')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={6}>
                <TextField select label={t('vehicles.active')} fullWidth defaultValue="true" {...register('isActive', { setValueAs: (v) => v === true || v === 'true' })} InputLabelProps={{ shrink: true }}>
                  <MenuItem value="true">{t('common.yes')}</MenuItem><MenuItem value="false">{t('common.no')}</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}><TextField label={t('vehicles.notes')} fullWidth multiline rows={2} {...register('notes')} InputLabelProps={{ shrink: true }} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Stack><Button type="submit" variant="contained" disabled={save.isPending}>{editId ? t('common.update') : t('common.create')}</Button></Stack>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
