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

const DAYS: Weekday[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export default function CustomerDetails() {
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
    onSuccess: () => { enqueueSnackbar('Schedule saved', { variant: 'success' }); qc.invalidateQueries({ queryKey: ['customer', id] }); },
  });

  const togglePause = useMutation({
    mutationFn: () => (customer?.isPaused ? customerApi.resume(id!) : customerApi.pause(id!)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer', id] }); enqueueSnackbar('Updated', { variant: 'success' }); },
  });

  const saveWaterDays = useMutation({
    mutationFn: () => customerApi.setDeliveryDates(id!, waterDays),
    onSuccess: (data) => {
      setWaterDays(data);
      enqueueSnackbar('Water days saved — customer and driver notified', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['customer-water-days', id] });
    },
  });

  // Soft-remove: hides the customer and blocks them from logging in (history kept).
  const removeCustomer = useMutation({
    mutationFn: () => customerApi.remove(id!),
    onSuccess: () => {
      enqueueSnackbar('Customer removed', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['customers'] });
      navigate('/customers');
    },
    onError: () => enqueueSnackbar('Could not remove customer', { variant: 'error' }),
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
            <Button variant="outlined" onClick={() => navigate(`/customers/${id}/edit`)}>Edit</Button>
            <Button variant="contained" color={customer.isPaused ? 'success' : 'warning'} onClick={() => togglePause.mutate()}>
              {customer.isPaused ? 'Resume Deliveries' : 'Pause Deliveries'}
            </Button>
            <Button variant="outlined" color="error" onClick={() => setConfirmRemove(true)}>Remove</Button>
          </Stack>
        }
      />

      <Dialog open={confirmRemove} onClose={() => setConfirmRemove(false)}>
        <DialogTitle>Remove customer?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {customer.name} will be removed and will no longer be able to log in. Their billing
            history is preserved and they can be restored later. Continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRemove(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => removeCustomer.mutate()} disabled={removeCustomer.isPending}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card><CardContent>
            <Typography variant="h6" mb={2}>Profile</Typography>
            <Stack spacing={1.2}>
              <Row label="Status" value={<StatusChip status={customer.status} />} />
              <Row label="Type" value={<Chip size="small" label={customer.customerType} />} />
              <Row label="Area" value={customer.area ?? '—'} />
              <Row label="Address" value={customer.address ?? '—'} />
              <Row label="Landmark" value={customer.landmark ?? '—'} />
              <Row label="Rate / Camper" value={`₹${customer.ratePerCamper}`} />
              <Row label="Security Deposit" value={`₹${customer.securityDeposit}`} />
              <Row label="Allocated Campers" value={String(customer.allocatedCampers)} />
              <Row label="Paused" value={customer.isPaused ? 'Yes' : 'No'} />
            </Stack>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card><CardContent>
            <Typography variant="h6" mb={1}>Weekday Quantity</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Default campers per weekday. Which days get a delivery is decided by the customer's
              water days below, not by these toggles.
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              {DAYS.map((d) => {
                const day = getDay(d);
                return (
                  <Stack key={d} direction="row" alignItems="center" justifyContent="space-between">
                    <FormControlLabel
                      control={<Switch checked={!!day.enabled} onChange={(e) => updateDay(d, { enabled: e.target.checked })} />}
                      label={d.charAt(0) + d.slice(1).toLowerCase()}
                      sx={{ width: 160 }}
                    />
                    <TextField
                      type="number" size="small" label="Qty" sx={{ width: 100 }}
                      value={day.quantity ?? 1} disabled={!day.enabled}
                      onChange={(e) => updateDay(d, { quantity: Number(e.target.value) })}
                    />
                  </Stack>
                );
              })}
            </Stack>
            <Button variant="contained" sx={{ mt: 3 }} onClick={() => saveSchedule.mutate()} disabled={saveSchedule.isPending}>
              Save Schedule
            </Button>
          </CardContent></Card>
        </Grid>

        <Grid item xs={12}>
          <Card><CardContent>
            <Typography variant="h6" mb={1}>Water Days (Requested)</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Dates the customer asked for water. Water is delivered only on these days — any date not
              listed here means no delivery. Changes notify the customer's driver.
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <TextField
                type="date" size="small" label="Add date"
                InputLabelProps={{ shrink: true }} inputProps={{ min: todayStr }}
                value={newDate} onChange={(e) => setNewDate(e.target.value)}
              />
              <Button variant="outlined" onClick={addWaterDay} disabled={!newDate}>Add</Button>
            </Stack>
            {waterDays.length ? (
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {waterDays.map((d) => (
                  <Chip key={d} color="success" variant="outlined" label={fmtDate(d)} onDelete={() => setWaterDays(waterDays.filter((x) => x !== d))} />
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">No upcoming water days selected — this customer receives nothing.</Typography>
            )}
            <Box>
              <Button variant="contained" sx={{ mt: 3 }} onClick={() => saveWaterDays.mutate()} disabled={saveWaterDays.isPending}>
                Save Water Days
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
