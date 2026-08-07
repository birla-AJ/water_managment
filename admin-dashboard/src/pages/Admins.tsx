import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, Dialog, DialogActions, DialogContent,
  Grid, IconButton, MenuItem, TextField, Tooltip, InputAdornment, Link, Chip, Typography,
  Select, FormControl, InputLabel, OutlinedInput, Checkbox, ListItemText, Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PeopleIcon from '@mui/icons-material/People';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { adminApi, serviceAreaApi } from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import { useAppSelector } from '../app/hooks';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';
import PasswordField from '../components/PasswordField';
import { dataGridSx } from '../theme/dataGrid';
import { BRAND_GRADIENT, BRAND_GRADIENT_SOFT } from '../theme/theme';
import type { Admin } from '../types';
import { useTranslation } from 'react-i18next';

interface FormValues {
  name: string;
  email: string;
  password: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  phone?: string;
  mobile?: string;
  isActive: 'true' | 'false';
  // Distributor service definition (text in the form; parsed on submit).
  latitude?: string;
  longitude?: string;
  serviceRadiusKm?: string;
  pincodes?: string; // comma-separated 6-digit pincodes
  serviceAreas?: string; // comma-separated locality names
}

const splitCsv = (s?: string): string[] =>
  (s ?? '').split(',').map((x) => x.trim()).filter(Boolean);

export default function Admins() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const me = useAppSelector((s) => s.auth.user);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  // Master-list area IDs linked to this distributor (multi-select).
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>();

  // Super admins manage regular admins — the list shows only ADMIN accounts (super admins are hidden).
  const { data, isLoading } = useQuery({ queryKey: ['admins', 'ADMIN'], queryFn: () => adminApi.list({ limit: 100, role: 'ADMIN' }) });
  // Shared master list of service areas, for the multi-select.
  const { data: masterAreas } = useQuery({ queryKey: ['service-areas'], queryFn: serviceAreaApi.list });

  const openCreate = () => {
    setEditId(null);
    setAreaIds([]);
    reset({
      name: '', email: '', password: '', role: 'ADMIN', phone: '', mobile: '', isActive: 'true',
      latitude: '', longitude: '', serviceRadiusKm: '5', pincodes: '', serviceAreas: '',
    });
    setOpen(true);
  };
  const openEdit = (a: Admin) => {
    setEditId(a.id);
    setAreaIds(a.areaLinks?.map((l) => l.id) ?? []);
    reset({
      name: a.name, email: a.email, password: '', role: a.role,
      phone: a.phone ?? '', mobile: a.mobile ?? '', isActive: a.isActive === false ? 'false' : 'true',
      latitude: a.latitude != null ? String(a.latitude) : '',
      longitude: a.longitude != null ? String(a.longitude) : '',
      serviceRadiusKm: a.serviceRadiusKm != null ? String(a.serviceRadiusKm) : '',
      pincodes: (a.pincodes ?? []).join(', '),
      serviceAreas: (a.serviceAreas ?? []).join(', '),
    });
    setOpen(true);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { enqueueSnackbar(t('adminsPage.geoNotSupported'), { variant: 'warning' }); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('latitude', pos.coords.latitude.toFixed(6));
        setValue('longitude', pos.coords.longitude.toFixed(6));
        enqueueSnackbar(t('adminsPage.locationCaptured'), { variant: 'success' });
      },
      () => enqueueSnackbar(t('adminsPage.locationFailed'), { variant: 'error' }),
    );
  };

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const base = {
        name: v.name,
        role: 'ADMIN' as const, // super admins create regular admins only
        phone: v.phone || undefined,
        mobile: v.mobile || undefined,
        isActive: v.isActive === 'true',
        // Distributor service definition
        latitude: v.latitude ? Number(v.latitude) : null,
        longitude: v.longitude ? Number(v.longitude) : null,
        serviceRadiusKm: v.serviceRadiusKm ? Number(v.serviceRadiusKm) : null,
        pincodes: splitCsv(v.pincodes),
        serviceAreas: splitCsv(v.serviceAreas),
        areaIds,
      };
      if (editId) {
        // Only send a password when one was typed.
        return adminApi.update(editId, { ...base, ...(v.password ? { password: v.password } : {}) });
      }
      return adminApi.create({ ...base, email: v.email, password: v.password });
    },
    onSuccess: () => {
      enqueueSnackbar(editId ? t('adminsPage.updatedToast') : t('adminsPage.createdToast'), { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['admins'] });
      setOpen(false);
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const del = useMutation({
    mutationFn: (id: string) => adminApi.remove(id),
    onSuccess: () => { enqueueSnackbar(t('adminsPage.deletedToast'), { variant: 'success' }); qc.invalidateQueries({ queryKey: ['admins'] }); },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const columns: GridColDef[] = [
    {
      field: 'name', headerName: t('common.name'), flex: 1, minWidth: 150,
      renderCell: (p) => (
        <Link component="button" underline="hover" onClick={() => navigate(`/admins/${p.row.id}`)} sx={{ fontWeight: 700 }}>
          {p.value}
        </Link>
      ),
    },
    { field: 'email', headerName: t('common.email'), flex: 1, minWidth: 200 },
    { field: 'mobile', headerName: t('common.mobile'), width: 130, valueFormatter: (v) => v ?? '—' },
    {
      field: 'role', headerName: t('adminsPage.colRole'), width: 150,
      renderCell: (p) => {
        const sa = p.value === 'SUPER_ADMIN';
        return (
          <Chip
            size="small" variant="outlined" label={sa ? t('adminsPage.superAdmin') : t('adminsPage.admin')}
            sx={{
              fontWeight: 700, fontSize: 11.5, height: 22,
              color: sa ? '#B6831A' : '#055152',
              borderColor: sa ? 'rgba(202,138,4,0.4)' : 'rgba(5,81,82,0.35)',
              bgcolor: sa ? 'rgba(202,138,4,0.08)' : 'rgba(5,81,82,0.07)',
            }}
          />
        );
      },
    },
    { field: 'isActive', headerName: t('adminsPage.colActive'), width: 110, renderCell: (p) => <StatusChip status={p.value === false ? 'INACTIVE' : 'ACTIVE'} /> },
    {
      field: 'customers', headerName: t('adminsPage.colCustomers'), width: 120, sortable: false,
      renderCell: (p) => (
        <Link component="button" underline="hover" onClick={() => navigate(`/admins/${p.row.id}`)} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
          <PeopleIcon fontSize="small" /> {p.row._count?.customers ?? 0}
        </Link>
      ),
    },
    { field: 'lastLoginAt', headerName: t('adminsPage.colLastLogin'), width: 160, valueFormatter: (v) => (v ? dayjs(v).format('DD MMM YYYY HH:mm') : t('adminsPage.never')) },
    {
      field: 'actions', headerName: t('adminsPage.colActions'), width: 140, sortable: false,
      renderCell: (p) => (
        <>
          <Tooltip title={t('adminsPage.viewDetails')}>
            <IconButton size="small" onClick={() => navigate(`/admins/${p.row.id}`)}><VisibilityIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title={t('adminsPage.edit')}>
            <IconButton size="small" onClick={() => openEdit(p.row)}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title={p.row.id === me?.id ? t('adminsPage.cannotDeleteSelf') : t('adminsPage.delete')}>
            <span>
              <IconButton
                size="small" disabled={p.row.id === me?.id} onClick={() => del.mutate(p.row.id)}
                sx={{ '&:hover': { color: 'error.main', bgcolor: 'rgba(211,47,47,0.10)' } }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title={t('nav.admins')}
        subtitle={t('adminsPage.subtitle')}
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>{t('adminsPage.addAdmin')}</Button>}
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
          rowHeight={58}
          sx={dataGridSx}
        />
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 3,
            py: 2.25,
            background: BRAND_GRADIENT_SOFT,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              background: BRAND_GRADIENT, color: '#FFFFFF', width: 44, height: 44, borderRadius: 2.5,
              display: 'grid', placeItems: 'center', boxShadow: '0 8px 18px -6px rgba(5,81,82,0.5)',
            }}
          >
            <AdminPanelSettingsIcon />
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} lineHeight={1.15}>{editId ? t('adminsPage.editAdmin') : t('adminsPage.addAdminTitle')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {editId ? t('adminsPage.updateAccount') : t('adminsPage.createAccount')}
            </Typography>
          </Box>
          <IconButton onClick={() => setOpen(false)} size="small"><CloseIcon fontSize="small" /></IconButton>
        </Box>
        <form onSubmit={handleSubmit((v) => save.mutate(v))}>
          <DialogContent sx={{ p: 3 }}>
            <Grid container spacing={2.25} sx={{ mt: 0 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label={t('common.name')} fullWidth {...register('name', { required: t('adminsPage.nameRequired'), minLength: { value: 2, message: t('adminsPage.minLength2') } })}
                  error={!!errors.name} helperText={errors.name?.message} InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label={t('common.email')} type="email" fullWidth disabled={!!editId}
                  {...register('email', editId ? {} : { required: t('adminsPage.emailRequired'), pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t('adminsPage.invalidEmail') } })}
                  error={!!errors.email} helperText={errors.email?.message} InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <PasswordField
                  label={editId ? t('adminsPage.newPasswordOptional') : t('adminsPage.password')} fullWidth
                  {...register('password', {
                    ...(editId ? {} : { required: t('adminsPage.passwordRequired') }),
                    validate: (v) => (!v || v.length >= 6 ? true : t('adminsPage.minLength6')),
                  })}
                  error={!!errors.password} helperText={errors.password?.message} InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label={t('adminsPage.mobileOtp')} fullWidth
                  {...register('mobile', { pattern: { value: /^[6-9]\d{9}$/, message: t('adminsPage.invalidMobile') } })}
                  error={!!errors.mobile} helperText={errors.mobile?.message}
                  InputProps={{ startAdornment: <InputAdornment position="start">+91</InputAdornment> }}
                  inputProps={{ maxLength: 10, inputMode: 'numeric' }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}><TextField label={t('settings.phone')} fullWidth {...register('phone')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={6}>
                <TextField select label={t('adminsPage.active')} fullWidth defaultValue="true" {...register('isActive')} InputLabelProps={{ shrink: true }}>
                  <MenuItem value="true">{t('common.yes')}</MenuItem>
                  <MenuItem value="false">{t('common.no')}</MenuItem>
                </TextField>
              </Grid>

              {/* ── Distributor service area ───────────────────────────────── */}
              <Grid item xs={12}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'primary.main' }}>
                    <PlaceOutlinedIcon fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={800}>{t('adminsPage.serviceAreaSection')}</Typography>
                  </Stack>
                  <Button size="small" startIcon={<MyLocationIcon fontSize="small" />} onClick={detectLocation}>
                    {t('adminsPage.useMyLocation')}
                  </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {t('adminsPage.serviceAreaHint')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label={t('adminsPage.latitude')} fullWidth {...register('latitude')} InputLabelProps={{ shrink: true }} inputProps={{ inputMode: 'decimal' }} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label={t('adminsPage.longitude')} fullWidth {...register('longitude')} InputLabelProps={{ shrink: true }} inputProps={{ inputMode: 'decimal' }} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label={t('adminsPage.serviceRadius')} fullWidth {...register('serviceRadiusKm')} InputLabelProps={{ shrink: true }} InputProps={{ endAdornment: <InputAdornment position="end">km</InputAdornment> }} inputProps={{ inputMode: 'decimal' }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label={t('adminsPage.pincodesServed')} fullWidth {...register('pincodes')} InputLabelProps={{ shrink: true }}
                  placeholder="452001, 452010" helperText={t('adminsPage.pincodesHelper')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label={t('adminsPage.serviceAreasFreeText')} fullWidth {...register('serviceAreas')} InputLabelProps={{ shrink: true }}
                  placeholder="Limbodi, Bhawarkua" helperText={t('adminsPage.serviceAreasHelper')}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel shrink id="areas-label">{t('adminsPage.serviceAreasMasterList')}</InputLabel>
                  <Select
                    labelId="areas-label"
                    multiple
                    displayEmpty
                    value={areaIds}
                    onChange={(e) => setAreaIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                    input={<OutlinedInput notched label={t('adminsPage.serviceAreasMasterList')} />}
                    renderValue={(selected) =>
                      (selected as string[]).length === 0 ? (
                        <Typography variant="body2" color="text.secondary">{t('adminsPage.noneSelected')}</Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as string[]).map((id) => (
                            <Chip key={id} size="small" label={masterAreas?.find((m) => m.id === id)?.name ?? id} />
                          ))}
                        </Box>
                      )
                    }
                  >
                    {(masterAreas ?? []).map((a) => (
                      <MenuItem key={a.id} value={a.id}>
                        <Checkbox checked={areaIds.includes(a.id)} />
                        <ListItemText primary={a.name} secondary={a.city ?? a.pincode ?? undefined} />
                      </MenuItem>
                    ))}
                    {(!masterAreas || masterAreas.length === 0) && (
                      <MenuItem disabled value="">{t('adminsPage.noMasterAreas')}</MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.75, pt: 0 }}>
            <Button onClick={() => setOpen(false)} color="inherit" sx={{ color: 'text.secondary' }}>{t('common.cancel')}</Button>
            <Button
              type="submit" variant="contained" disabled={save.isPending}
              startIcon={editId ? <CheckIcon /> : <AddIcon />}
            >
              {save.isPending ? t('common.saving') : editId ? t('common.update') : t('common.create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
