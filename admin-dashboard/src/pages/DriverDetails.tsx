import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Grid, IconButton, List, ListItem, ListItemText, Stack, TextField, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CampaignIcon from '@mui/icons-material/Campaign';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { driverApi, customerApi } from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.75 }}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography fontWeight={500}>{value}</Typography>
    </Stack>
  );
}

export default function DriverDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const [assignOpen, setAssignOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');

  const { data: driver, isLoading } = useQuery({ queryKey: ['driver', id], queryFn: () => driverApi.get(id!) });

  // Candidate customers to assign (searchable).
  const { data: candidates } = useQuery({
    queryKey: ['assignable-customers', search],
    queryFn: () => customerApi.list({ search, limit: 50 }),
    enabled: assignOpen,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['driver', id] });

  const assign = useMutation({
    mutationFn: () => driverApi.assignCustomers(id!, Object.keys(picked).filter((k) => picked[k])),
    onSuccess: () => {
      enqueueSnackbar('Customers assigned', { variant: 'success' });
      setAssignOpen(false); setPicked({}); invalidate();
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const unassign = useMutation({
    mutationFn: (customerId: string) => driverApi.unassignCustomer(id!, customerId),
    onSuccess: () => { enqueueSnackbar('Customer removed', { variant: 'success' }); invalidate(); },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const sendNote = useMutation({
    mutationFn: () => driverApi.notify(id!, noteTitle, noteBody),
    onSuccess: () => {
      enqueueSnackbar('Notification sent to driver', { variant: 'success' });
      setNotifyOpen(false); setNoteTitle(''); setNoteBody('');
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  if (isLoading || !driver) return <Box sx={{ p: 3 }}>Loading…</Box>;

  const assignedIds = new Set((driver.customers ?? []).map((c) => c.id));

  return (
    <Box>
      <PageHeader
        title={driver.name}
        subtitle={`Driver · ${driver.mobile}`}
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<CampaignIcon />} onClick={() => setNotifyOpen(true)}>Notify</Button>
            <Button variant="contained" startIcon={<EditIcon />} onClick={() => navigate(`/drivers/${id}/edit`)}>Edit</Button>
          </Stack>
        }
      />

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Profile</Typography>
              <Row label="Status" value={<StatusChip status={driver.status} />} />
              <Row label="Mobile" value={driver.mobile} />
              <Row label="Zone" value={driver.zone ?? '—'} />
              <Row label="Vehicle" value={driver.vehicle ? `${driver.vehicle.number}${driver.vehicle.type ? ` (${driver.vehicle.type})` : ''}` : '—'} />
              <Row label="License" value={driver.licenseNumber ?? '—'} />
              <Row label="Email" value={driver.email ?? '—'} />
              <Row label="Assigned customers" value={driver._count?.customers ?? driver.customers?.length ?? 0} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6">Assigned Customers</Typography>
                <Button size="small" variant="contained" startIcon={<PersonAddIcon />} onClick={() => setAssignOpen(true)}>Assign</Button>
              </Stack>
              <Divider />
              <List dense>
                {(driver.customers ?? []).length === 0 && (
                  <Typography color="text.secondary" sx={{ py: 2 }}>No customers assigned yet.</Typography>
                )}
                {(driver.customers ?? []).map((c) => (
                  <ListItem
                    key={c.id}
                    secondaryAction={
                      <IconButton edge="end" size="small" onClick={() => unassign.mutate(c.id)}><DeleteIcon fontSize="small" /></IconButton>
                    }
                  >
                    <ListItemText
                      primary={<>{c.name} {c.isPaused && <Chip size="small" color="warning" label="Paused" sx={{ ml: 1 }} />}</>}
                      secondary={`${c.mobile}${c.area ? ` · ${c.area}` : ''}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Assign customers dialog */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Assign customers to {driver.name}</DialogTitle>
        <DialogContent>
          <TextField
            label="Search name / mobile / area" fullWidth size="small" sx={{ my: 1 }}
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
          <List dense sx={{ maxHeight: 360, overflow: 'auto' }}>
            {(candidates?.data ?? []).map((c) => {
              const already = assignedIds.has(c.id);
              return (
                <ListItem key={c.id} disablePadding>
                  <ListItem
                    component="div"
                    onClick={() => !already && setPicked((p) => ({ ...p, [c.id]: !p[c.id] }))}
                    sx={{ cursor: already ? 'default' : 'pointer', opacity: already ? 0.5 : 1 }}
                  >
                    <input type="checkbox" readOnly checked={already || !!picked[c.id]} disabled={already} style={{ marginRight: 12 }} />
                    <ListItemText
                      primary={c.name}
                      secondary={`${c.mobile}${c.area ? ` · ${c.area}` : ''}${already ? ' · already assigned' : ''}`}
                    />
                  </ListItem>
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={assign.isPending || Object.values(picked).every((v) => !v)}
            onClick={() => assign.mutate()}
          >
            Assign selected
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notify driver dialog */}
      <Dialog open={notifyOpen} onClose={() => setNotifyOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Send notification to {driver.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" fullWidth value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
            <TextField label="Message" fullWidth multiline rows={3} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotifyOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={sendNote.isPending || !noteTitle || !noteBody} onClick={() => sendNote.mutate()}>Send</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
