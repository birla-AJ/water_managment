import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Card, CardContent, Grid, TextField, MenuItem, Button, Stack, InputAdornment } from '@mui/material';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { driverApi, vehicleApi } from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import { useTranslation } from 'react-i18next';
import type { Driver } from '../types';

type FormValues = Partial<Driver>;

export default function DriverForm() {
  const { t } = useTranslation();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { status: 'ACTIVE' },
  });

  const { data } = useQuery({ queryKey: ['driver', id], queryFn: () => driverApi.get(id!), enabled: isEdit });
  // Vehicles available for assignment (free ones + the driver's current one).
  const { data: vehicles } = useQuery({ queryKey: ['vehicles', 'available'], queryFn: () => vehicleApi.available() });

  useEffect(() => {
    if (data) reset({ ...data, vehicleId: data.vehicle?.id ?? data.vehicleId ?? '' });
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: FormValues = { ...values, vehicleId: values.vehicleId || null };
      return isEdit ? driverApi.update(id!, payload) : driverApi.create(payload);
    },
    onSuccess: () => {
      enqueueSnackbar(isEdit ? t('driverForm.updatedToast') : t('driverForm.createdToast'), { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      navigate('/drivers');
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  // Build vehicle options: the available list, plus the driver's current vehicle (which isn't "available").
  const vehicleOptions = [
    ...(data?.vehicle ? [{ id: data.vehicle.id, number: data.vehicle.number }] : []),
    ...(vehicles ?? []).filter((v) => v.id !== data?.vehicle?.id).map((v) => ({ id: v.id, number: v.number })),
  ];

  return (
    <Box>
      <PageHeader title={isEdit ? t('driverForm.editTitle') : t('driverForm.addTitle')} subtitle={t('driverForm.subtitle')} />
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label={t('common.name')} fullWidth {...register('name', { required: t('driverForm.nameRequired'), minLength: { value: 2, message: t('driverForm.minLength2') } })}
                  error={!!errors.name} helperText={errors.name?.message} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('driverForm.mobileLogin')} fullWidth disabled={isEdit}
                  {...register('mobile', isEdit ? {} : { required: t('driverForm.mobileRequired'), pattern: { value: /^[6-9]\d{9}$/, message: t('driverForm.invalidMobile') } })}
                  error={!!errors.mobile} helperText={errors.mobile?.message}
                  InputProps={{ startAdornment: <InputAdornment position="start">+91</InputAdornment> }}
                  inputProps={{ maxLength: 10, inputMode: 'numeric' }} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('common.email')} fullWidth
                  {...register('email', { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t('driverForm.invalidEmail') } })}
                  error={!!errors.email} helperText={errors.email?.message} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6}><TextField label={t('driverForm.licenseNumber')} fullWidth {...register('licenseNumber')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={6}><TextField label={t('driverForm.zone')} fullWidth placeholder="e.g. Kothrud" {...register('zone')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={8}><TextField label={t('common.address')} fullWidth {...register('address')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={4}>
                <TextField select label={t('driverForm.statusField')} fullWidth defaultValue="ACTIVE" {...register('status')} InputLabelProps={{ shrink: true }}>
                  <MenuItem value="ACTIVE">{t('common.active')}</MenuItem><MenuItem value="INACTIVE">{t('common.inactive')}</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select label={t('driverForm.vehicle')} fullWidth defaultValue="" {...register('vehicleId')} InputLabelProps={{ shrink: true }}>
                  <MenuItem value="">{t('driverForm.none')}</MenuItem>
                  {vehicleOptions.map((v) => <MenuItem key={v.id} value={v.id}>{v.number}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button type="submit" variant="contained" disabled={mutation.isPending}>{isEdit ? t('common.update') : t('common.create')}</Button>
              <Button variant="outlined" onClick={() => navigate('/drivers')}>{t('common.cancel')}</Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
