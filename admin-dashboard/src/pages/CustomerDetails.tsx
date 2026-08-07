import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Grid, Typography, Stack, Button, Chip, Divider,
  FormControlLabel, Switch, TextField, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useState, useEffect } from 'react';
import { customerApi } from '../api/endpoints';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';
import type { CustomerSchedule, Weekday } from '../types';
import { useTranslation } from 'react-i18next';

const DAYS: Weekday[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export default function CustomerDetails() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [schedules, setSchedules] = useState<Partial<CustomerSchedule>[]>([]);
  // Days the customer asked for water on — deliveries are opt-in.
  const [waterDays, setWaterDays] = useState<string[]>([]);
  const [newDate, setNewDate] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);

  const { data: customer } = useQuery({ queryKey: ['customer', id], queryFn: () => customerApi.get(id!) });
  const { data: waterDayData } = useQuery({ queryKey: ['customer-water-days', id], queryFn: () => customerApi.deliveryDates(id!) });

  useEffect(() => {
    if (customer?.schedules) setSchedules(customer.schedules);
  }, [customer]);

  useEffect(() => {
    if (waterDayData) setWaterDays(waterDayData);
  }, [waterDayData]);

  const saveSchedule = useMutation({
    mutationFn: () => customerApi.updateSchedules(id!, schedules.map((s) => ({ weekday: s.weekday, enabled: s.enabled, quantity: s.quantity ?? 1 }))),
    onSuccess: () => { enqueueSnackbar(t('customerDetails.scheduleSavedToast'), { variant: 'success' }); qc.invalidateQueries({ queryKey: ['customer', id] }); },
  });

  const togglePause = useMutation({
    mutationFn: () => (customer?.isPaused ? customerApi.resume(id!) : customerApi.pause(id!)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer', id] }); enqueueSnackbar(t('customerDetails.updatedToast'), { variant: 'success' }); },
  });

  const saveWaterDays = useMutation({
    mutationFn: () => customerApi.setDeliveryDates(id!, waterDays),
    onSuccess: (data) => {
      setWaterDays(data);
      enqueueSnackbar(t('customerDetails.waterDaysSavedToast'), { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['customer-water-days', id] });
    },
  });

  // Soft-remove: hides the customer and blocks them from logging in (history kept).
  const removeCustomer = useMutation({
    mutationFn: () => customerApi.remove(id!),
    onSuccess: () => {
      enqueueSnackbar(t('customerDetails.removedToast'), { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['customers'] });
      navigate('/customers');
    },
    onError: () => enqueueSnackbar(t('customerDetails.removeFailedToast'), { variant: 'error' }),
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const addWaterDay = () => {
    if (newDate && !waterDays.includes(newDate)) setWaterDays([...waterDays, newDate].sort());
    setNewDate('');
  };

  if (!customer) return null;

  const getDay = (d: Weekday) => schedules.find((s) => s.weekday === d) ?? { weekday: d, enabled: false, quantity: 1 };
  const updateDay = (d: Weekday, patch: Partial<CustomerSchedule>) =>
    setSchedules((prev) => {
      const exists = prev.find((s) => s.weekday === d);
      if (exists) return prev.map((s) => (s.weekday === d ? { ...s, ...patch } : s));
      return [...prev, { weekday: d, enabled: false, quantity: 1, ...patch }];
    });

  return (
    <Box>
      <PageHeader
        title={customer.name}
        subtitle={customer.mobile}
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => navigate(`/customers/${id}/edit`)}>{t('customerDetails.edit')}</Button>
            <Button variant="contained" color={customer.isPaused ? 'success' : 'warning'} onClick={() => togglePause.mutate()}>
              {customer.isPaused ? t('customerDetails.resumeDeliveries') : t('customerDetails.pauseDeliveries')}
            </Button>
            <Button variant="outlined" color="error" onClick={() => setConfirmRemove(true)}>{t('customerDetails.remove')}</Button>
          </Stack>
        }
      />

      <Dialog open={confirmRemove} onClose={() => setConfirmRemove(false)}>
        <DialogTitle>{t('customerDetails.removeTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('customerDetails.removeBody', { name: customer.name })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRemove(false)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={() => removeCustomer.mutate()} disabled={removeCustomer.isPending}>
            {t('customerDetails.remove')}
          </Button>
        </DialogActions>
      </Dialog>
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card><CardContent>
            <Typography variant="h6" mb={2}>{t('customerDetails.profile')}</Typography>
            <Stack spacing={1.2}>
              <Row label={t('common.status')} value={<StatusChip status={customer.status} />} />
              <Row label={t('customerDetails.rowType')} value={<Chip size="small" label={customer.customerType} />} />
              <Row label={t('customerDetails.rowArea')} value={customer.area ?? '—'} />
              <Row label={t('customerDetails.rowAddress')} value={customer.address ?? '—'} />
              <Row label={t('customerDetails.rowLandmark')} value={customer.landmark ?? '—'} />
              <Row label={t('customerDetails.rowRate')} value={`₹${customer.ratePerCamper}`} />
              <Row label={t('customerDetails.rowDeposit')} value={`₹${customer.securityDeposit}`} />
              <Row label={t('customerDetails.rowCampers')} value={String(customer.allocatedCampers)} />
              <Row label={t('customerDetails.rowPaused')} value={customer.isPaused ? t('common.yes') : t('common.no')} />
            </Stack>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card><CardContent>
            <Typography variant="h6" mb={1}>{t('customerDetails.weekdayQty')}</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('customerDetails.weekdayQtyDesc')}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              {DAYS.map((d) => {
                const day = getDay(d);
                return (
                  <Stack key={d} direction="row" alignItems="center" justifyContent="space-between">
                    <FormControlLabel
                      control={<Switch checked={!!day.enabled} onChange={(e) => updateDay(d, { enabled: e.target.checked })} />}
                      label={t(`common.weekdays.${d}`)}
                      sx={{ width: 160 }}
                    />
                    <TextField
                      type="number" size="small" label={t('customerDetails.qty')} sx={{ width: 100 }}
                      value={day.quantity ?? 1} disabled={!day.enabled}
                      onChange={(e) => updateDay(d, { quantity: Number(e.target.value) })}
                    />
                  </Stack>
                );
              })}
            </Stack>
            <Button variant="contained" sx={{ mt: 3 }} onClick={() => saveSchedule.mutate()} disabled={saveSchedule.isPending}>
              {t('customerDetails.saveSchedule')}
            </Button>
          </CardContent></Card>
        </Grid>

        <Grid item xs={12}>
          <Card><CardContent>
            <Typography variant="h6" mb={1}>{t('customerDetails.waterDays')}</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('customerDetails.waterDaysDesc')}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <TextField
                type="date" size="small" label={t('customerDetails.addDate')}
                InputLabelProps={{ shrink: true }} inputProps={{ min: todayStr }}
                value={newDate} onChange={(e) => setNewDate(e.target.value)}
              />
              <Button variant="outlined" onClick={addWaterDay} disabled={!newDate}>{t('common.add')}</Button>
            </Stack>
            {waterDays.length ? (
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {waterDays.map((d) => (
                  <Chip key={d} color="success" variant="outlined" label={fmtDate(d)} onDelete={() => setWaterDays(waterDays.filter((x) => x !== d))} />
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">{t('customerDetails.noWaterDays')}</Typography>
            )}
            <Box>
              <Button variant="contained" sx={{ mt: 3 }} onClick={() => saveWaterDays.mutate()} disabled={saveWaterDays.isPending}>
                {t('customerDetails.saveWaterDays')}
              </Button>
            </Box>
          </CardContent></Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography color="text.secondary">{label}</Typography>
      <Typography fontWeight={600} component="div">{value}</Typography>
    </Stack>
  );
}
