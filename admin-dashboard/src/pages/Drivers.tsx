import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, TextField, MenuItem, Stack, IconButton, Select, SelectChangeEvent, Typography, Dialog, DialogActions, DialogContent, DialogTitle, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { driverApi, vehicleApi } from '../api/endpoints';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';
import { useSnackbar } from 'notistack';
import { apiErrorMessage } from '../api/client';
import { useTranslation } from 'react-i18next';

export default function Drivers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleCapacity, setVehicleCapacity] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['drivers', search, status, page, pageSize],
    queryFn: () => driverApi.list({ search, status: status || undefined, page: page + 1, limit: pageSize }),
  });
  const { data: availableVehicles = [] } = useQuery({ queryKey: ['vehicles', 'available'], queryFn: vehicleApi.available });

  const assignVehicle = useMutation({
    mutationFn: ({ driverId, vehicleId }: { driverId: string; vehicleId: string | null }) => driverApi.assignVehicle(driverId, vehicleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      enqueueSnackbar(t('driversPage.vehicleAssignedToast'), { variant: 'success' });
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  });
  const createVehicle = useMutation({
    mutationFn: () => vehicleApi.create({
      number: vehicleNumber.trim(),
      type: vehicleType.trim() || undefined,
      capacity: vehicleCapacity ? Number(vehicleCapacity) : undefined,
      isActive: true,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      enqueueSnackbar(t('driversPage.vehicleAddedToast'), { variant: 'success' });
      setVehicleDialogOpen(false);
      setVehicleNumber(''); setVehicleType(''); setVehicleCapacity('');
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  });
  const updateDriverStatus = useMutation({
    mutationFn: ({ driverId, status }: { driverId: string; status: 'ACTIVE' | 'INACTIVE' }) => driverApi.update(driverId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      enqueueSnackbar(t('driversPage.statusUpdatedToast'), { variant: 'success' });
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  });

  const vehicleOptions = (current?: { id: string; number: string } | null) => {
    const options = current ? [current, ...availableVehicles.filter((vehicle) => vehicle.id !== current.id)] : availableVehicles;
    return options;
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: t('common.name'), flex: 1, minWidth: 150 },
    { field: 'mobile', headerName: t('common.mobile'), width: 130 },
    { field: 'zone', headerName: t('driversPage.colZone'), width: 130, valueFormatter: (v) => v ?? '—' },
    {
      field: 'vehicle', headerName: t('driversPage.colVehicleAssignment'), width: 230, sortable: false,
      renderCell: (p) => {
        const current = p.value as { id: string; number: string } | null;
        const changeVehicle = (event: SelectChangeEvent<string>) => {
          const vehicleId = event.target.value || null;
          if (vehicleId !== (current?.id ?? null)) assignVehicle.mutate({ driverId: p.row.id, vehicleId });
        };
        return (
          <Select
            size="small"
            value={current?.id ?? ''}
            displayEmpty
            onChange={changeVehicle}
            disabled={assignVehicle.isPending}
            onClick={(event) => event.stopPropagation()}
            sx={{ minWidth: 190, bgcolor: 'background.paper' }}
          >
            <MenuItem value=""><em>{t('driversPage.unassigned')}</em></MenuItem>
            {vehicleOptions(current).map((vehicle) => <MenuItem key={vehicle.id} value={vehicle.id}>{vehicle.number}</MenuItem>)}
          </Select>
        );
      },
    },
    {
      field: '_count', headerName: t('driversPage.colCustomers'), width: 110,
      renderCell: (p) => p.value?.customers ?? 0,
    },
    {
      field: 'isOnDuty', headerName: t('driversPage.colDutyStatus'), width: 120,
      renderCell: (p) => <Chip size="small" label={p.value ? t('driversPage.onDuty') : t('driversPage.offDuty')} color={p.value ? 'success' : 'default'} variant={p.value ? 'filled' : 'outlined'} />,
    },
    {
      field: 'status', headerName: t('driversPage.colAccountStatus'), width: 165, sortable: false,
      renderCell: (p) => (
        <Select
          size="small"
          value={p.value}
          onChange={(event: SelectChangeEvent<'ACTIVE' | 'INACTIVE'>) => {
            const status = event.target.value as 'ACTIVE' | 'INACTIVE';
            if (status !== p.value) updateDriverStatus.mutate({ driverId: p.row.id, status });
          }}
          disabled={updateDriverStatus.isPending}
          onClick={(event) => event.stopPropagation()}
          sx={{ minWidth: 135, '& .MuiSelect-select': { py: 0.65, fontWeight: 700 } }}
        >
          <MenuItem value="ACTIVE"><StatusChip status="ACTIVE" /></MenuItem>
          <MenuItem value="INACTIVE"><StatusChip status="INACTIVE" /></MenuItem>
        </Select>
      ),
    },
    {
      field: 'actions', headerName: t('driversPage.colActions'), width: 110, sortable: false,
      renderCell: (p) => (
        <>
          <IconButton size="small" onClick={() => navigate(`/drivers/${p.row.id}`)}><VisibilityIcon fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => navigate(`/drivers/${p.row.id}/edit`)}><EditIcon fontSize="small" /></IconButton>
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title={t('nav.driversVehicles')}
        subtitle={t('driversPage.subtitle')}
        action={
          <Stack direction="row" spacing={1.25}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setVehicleDialogOpen(true)}>{t('driversPage.addVehicle')}</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/drivers/new')}>{t('driversPage.addDriver')}</Button>
          </Stack>
        }
      />
      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label={t('driversPage.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} size="small" sx={{ minWidth: 280 }} />
          <TextField select label={t('common.status')} value={status} onChange={(e) => setStatus(e.target.value)} size="small" sx={{ minWidth: 160 }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            <MenuItem value="ACTIVE">{t('common.active')}</MenuItem>
            <MenuItem value="INACTIVE">{t('common.inactive')}</MenuItem>
          </TextField>
        </Stack>
      </Card>
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
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25, px: 0.5 }}>
        {t('driversPage.vehicleHint')}
      </Typography>

      <Dialog open={vehicleDialogOpen} onClose={() => !createVehicle.isPending && setVehicleDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('driversPage.addVehicle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label={t('driversPage.vehicleNumber')} value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} required autoFocus fullWidth />
            <TextField label={t('driversPage.vehicleType')} placeholder="Tempo, Van…" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} fullWidth />
            <TextField label={t('driversPage.capacityCampers')} type="number" value={vehicleCapacity} onChange={(e) => setVehicleCapacity(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setVehicleDialogOpen(false)} disabled={createVehicle.isPending}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={() => createVehicle.mutate()} disabled={!vehicleNumber.trim() || createVehicle.isPending}>
            {t('driversPage.addVehicle')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
