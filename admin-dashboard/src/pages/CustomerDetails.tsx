import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Grid, Typography, Stack, Button, Chip, Divider,
  FormControlLabel, Switch, TextField,
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
  const [skips, setSkips] = useState<string[]>([]);
  const [newDate, setNewDate] = useState('');

  const { data: customer } = useQuery({ queryKey: ['customer', id], queryFn: () => customerApi.get(id!) });
  const { data: skipData } = useQuery({ queryKey: ['customer-skips', id], queryFn: () => customerApi.skipDates(id!) });

  useEffect(() => {
    if (customer?.schedules) setSchedules(customer.schedules);
  }, [customer]);

  useEffect(() => {
    if (skipData) setSkips(skipData);
  }, [skipData]);

  const saveSchedule = useMutation({
    mutationFn: () => customerApi.updateSchedules(id!, schedules.map((s) => ({ weekday: s.weekday, enabled: s.enabled, quantity: s.quantity ?? 1 }))),
    onSuccess: () => { enqueueSnackbar('Schedule saved', { variant: 'success' }); qc.invalidateQueries({ queryKey: ['customer', id] }); },
  });

  const togglePause = useMutation({
    mutationFn: () => (customer?.isPaused ? customerApi.resume(id!) : customerApi.pause(id!)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer', id] }); enqueueSnackbar('Updated', { variant: 'success' }); },
  });

  const saveSkips = useMutation({
    mutationFn: () => customerApi.setSkipDates(id!, skips),
    onSuccess: (data) => { setSkips(data); enqueueSnackbar('Unavailable days saved', { variant: 'success' }); qc.invalidateQueries({ queryKey: ['customer-skips', id] }); },
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const addSkip = () => {
    if (newDate && !skips.includes(newDate)) setSkips([...skips, newDate].sort());
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
          </Stack>
        }
      />
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
            <Typography variant="h6" mb={1}>Delivery Schedule</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>Enable/disable delivery and set quantity per weekday.</Typography>
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
            <Typography variant="h6" mb={1}>Unavailable Days (Skips)</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Dates the customer marked as away. No delivery is generated on these days.
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <TextField
                type="date" size="small" label="Add date"
                InputLabelProps={{ shrink: true }} inputProps={{ min: todayStr }}
                value={newDate} onChange={(e) => setNewDate(e.target.value)}
              />
              <Button variant="outlined" onClick={addSkip} disabled={!newDate}>Add</Button>
            </Stack>
            {skips.length ? (
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {skips.map((d) => (
                  <Chip key={d} color="warning" variant="outlined" label={fmtDate(d)} onDelete={() => setSkips(skips.filter((x) => x !== d))} />
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">No upcoming skipped days.</Typography>
            )}
            <Box>
              <Button variant="contained" sx={{ mt: 3 }} onClick={() => saveSkips.mutate()} disabled={saveSkips.isPending}>
                Save Unavailable Days
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
