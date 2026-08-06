import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Card, CardContent, Grid, TextField, MenuItem, Button, Stack, InputAdornment } from '@mui/material';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { customerApi } from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import type { Customer } from '../types';

type FormValues = Partial<Customer>;

export default function CustomerForm() {
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
      enqueueSnackbar(`Customer ${isEdit ? 'updated' : 'created'}`, { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['customers'] });
      navigate('/customers');
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  return (
    <Box>
      <PageHeader title={isEdit ? 'Edit Customer' : 'Add Customer'} />
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="Name" fullWidth {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'At least 2 characters' } })}
                  error={!!errors.name} helperText={errors.name?.message} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Mobile" fullWidth disabled={isEdit}
                  {...register('mobile', isEdit ? {} : { required: 'Mobile is required', pattern: { value: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit mobile' } })}
                  error={!!errors.mobile} helperText={errors.mobile?.message}
                  InputProps={{ startAdornment: <InputAdornment position="start">+91</InputAdornment> }}
                  inputProps={{ maxLength: 10, inputMode: 'numeric' }} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Email" fullWidth
                  {...register('email', { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' } })}
                  error={!!errors.email} helperText={errors.email?.message} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={8}><TextField label="Address" fullWidth {...register('address')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={4}><TextField label="Area" fullWidth {...register('area')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Landmark" fullWidth {...register('landmark')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={3}>
                <TextField select label="Customer Type" fullWidth defaultValue="DAILY" {...register('customerType')} InputLabelProps={{ shrink: true }}>
                  <MenuItem value="DAILY">Daily</MenuItem><MenuItem value="WEEKLY">Weekly</MenuItem><MenuItem value="MONTHLY">Monthly</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField select label="Status" fullWidth defaultValue="ACTIVE" {...register('status')} InputLabelProps={{ shrink: true }}>
                  <MenuItem value="ACTIVE">Active</MenuItem><MenuItem value="INACTIVE">Inactive</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}><TextField label="Security Deposit" type="number" fullWidth {...register('securityDeposit')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={4}><TextField label="Rate / Camper" type="number" fullWidth {...register('ratePerCamper')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={4}><TextField label="Allocated Campers" type="number" fullWidth {...register('allocatedCampers')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12}><TextField label="Notes" fullWidth multiline rows={3} {...register('notes')} InputLabelProps={{ shrink: true }} /></Grid>
            </Grid>
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button type="submit" variant="contained" disabled={mutation.isPending}>{isEdit ? 'Update' : 'Create'}</Button>
              <Button variant="outlined" onClick={() => navigate('/customers')}>Cancel</Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
