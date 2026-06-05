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

type FormValues = Partial<Vehicle>;

export default function Vehicles() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<FormValues>();

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
      enqueueSnackbar(`Vehicle ${editId ? 'updated' : 'created'}`, { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      setOpen(false);
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const del = useMutation({
    mutationFn: (id: string) => vehicleApi.remove(id),
    onSuccess: () => { enqueueSnackbar('Vehicle deleted', { variant: 'success' }); qc.invalidateQueries({ queryKey: ['vehicles'] }); },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const columns: GridColDef[] = [
    { field: 'number', headerName: 'Vehicle No.', flex: 1, minWidth: 140 },
    { field: 'type', headerName: 'Type', width: 130 },
    { field: 'capacity', headerName: 'Capacity', width: 100 },
    {
      field: 'driver', headerName: 'Assigned to', flex: 1, minWidth: 160,
      renderCell: (p) => (p.value ? `${p.value.name} (${p.value.mobile})` : '—'),
    },
    { field: 'isActive', headerName: 'Active', width: 100, renderCell: (p) => <StatusChip status={p.value ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      field: 'actions', headerName: 'Actions', width: 110, sortable: false,
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
      <PageHeader
        title="Vehicles"
        subtitle="Delivery vehicles you can assign to drivers"
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add Vehicle</Button>}
      />
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
        <DialogTitle>{editId ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
        <form onSubmit={handleSubmit((v) => save.mutate(v))}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0 }}>
              <Grid item xs={12} sm={6}><TextField label="Vehicle Number" fullWidth required {...register('number')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Type (Tempo, Van…)" fullWidth {...register('type')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Capacity (campers)" type="number" fullWidth {...register('capacity')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={6}>
                <TextField select label="Active" fullWidth defaultValue="true" {...register('isActive', { setValueAs: (v) => v === true || v === 'true' })} InputLabelProps={{ shrink: true }}>
                  <MenuItem value="true">Yes</MenuItem><MenuItem value="false">No</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}><TextField label="Notes" fullWidth multiline rows={2} {...register('notes')} InputLabelProps={{ shrink: true }} /></Grid>
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
