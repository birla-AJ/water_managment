import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Card, CardContent, Grid, TextField, MenuItem, Button, Stack, InputAdornment } from '@mui/material';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { customerApi } from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import { useTranslation } from 'react-i18next';
import type { Customer } from '../types';

type FormValues = Partial<Customer>;

export default function CustomerForm() {
  const { t } = useTranslation();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { customerType: 'DAILY', status: 'ACTIVE', securityDeposit: 0, ratePerCamper: 30, allocatedCampers: 1 },
  });

  const { data } = useQuery({ queryKey: ['customer', id], queryFn: () => customerApi.get(id!), enabled: isEdit });
  useEffect(() => { if (data) reset(data); }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        ...values,
        securityDeposit: Number(values.securityDeposit),
        ratePerCamper: Number(values.ratePerCamper),
        allocatedCampers: Number(values.allocatedCampers),
      };
      return isEdit ? customerApi.update(id!, payload) : customerApi.create(payload);
    },
    onSuccess: () => {
      enqueueSnackbar(isEdit ? t('customerForm.updatedToast') : t('customerForm.createdToast'), { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['customers'] });
      navigate('/customers');
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  return (
    <Box>
      <PageHeader title={isEdit ? t('customerForm.editTitle') : t('customerForm.addTitle')} />
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label={t('common.name')} fullWidth {...register('name', { required: t('customerForm.nameRequired'), minLength: { value: 2, message: t('customerForm.minLength2') } })}
                  error={!!errors.name} helperText={errors.name?.message} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('common.mobile')} fullWidth disabled={isEdit}
                  {...register('mobile', isEdit ? {} : { required: t('customerForm.mobileRequired'), pattern: { value: /^[6-9]\d{9}$/, message: t('customerForm.invalidMobile') } })}
                  error={!!errors.mobile} helperText={errors.mobile?.message}
                  InputProps={{ startAdornment: <InputAdornment position="start">+91</InputAdornment> }}
                  inputProps={{ maxLength: 10, inputMode: 'numeric' }} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('common.email')} fullWidth
                  {...register('email', { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t('customerForm.invalidEmail') } })}
                  error={!!errors.email} helperText={errors.email?.message} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={8}><TextField label={t('common.address')} fullWidth {...register('address')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('customerForm.area')} fullWidth {...register('area')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={6}><TextField label={t('customerForm.landmark')} fullWidth {...register('landmark')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={3}>
                <TextField select label={t('customerForm.customerType')} fullWidth defaultValue="DAILY" {...register('customerType')} InputLabelProps={{ shrink: true }}>
                  <MenuItem value="DAILY">{t('customerForm.daily')}</MenuItem><MenuItem value="WEEKLY">{t('customerForm.weekly')}</MenuItem><MenuItem value="MONTHLY">{t('customerForm.monthly')}</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField select label={t('common.status')} fullWidth defaultValue="ACTIVE" {...register('status')} InputLabelProps={{ shrink: true }}>
                  <MenuItem value="ACTIVE">{t('common.active')}</MenuItem><MenuItem value="INACTIVE">{t('common.inactive')}</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}><TextField label={t('customerForm.securityDeposit')} type="number" fullWidth {...register('securityDeposit')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('customerForm.ratePerCamper')} type="number" fullWidth {...register('ratePerCamper')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('customerForm.allocatedCampers')} type="number" fullWidth {...register('allocatedCampers')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12}><TextField label={t('customerForm.notes')} fullWidth multiline rows={3} {...register('notes')} InputLabelProps={{ shrink: true }} /></Grid>
            </Grid>
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button type="submit" variant="contained" disabled={mutation.isPending}>{isEdit ? t('common.update') : t('common.create')}</Button>
              <Button variant="outlined" onClick={() => navigate('/customers')}>{t('common.cancel')}</Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
