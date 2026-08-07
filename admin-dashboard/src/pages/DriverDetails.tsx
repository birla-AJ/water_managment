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
import { useTranslation } from 'react-i18next';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.75 }}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography fontWeight={500}>{value}</Typography>
    </Stack>
  );
}

export default function DriverDetails() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const [assignOpen, setAssignOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
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
      enqueueSnackbar(t('driverDetails.assignedToast'), { variant: 'success' });
      setAssignOpen(false); setPicked({}); invalidate();
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const unassign = useMutation({
    mutationFn: (customerId: string) => driverApi.unassignCustomer(id!, customerId),
    onSuccess: () => { enqueueSnackbar(t('driverDetails.unassignedToast'), { variant: 'success' }); invalidate(); },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const sendNote = useMutation({
    mutationFn: () => driverApi.notify(id!, noteTitle, noteBody),
    onSuccess: () => {
      enqueueSnackbar(t('driverDetails.notifySentToast'), { variant: 'success' });
      setNotifyOpen(false); setNoteTitle(''); setNoteBody('');
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  // Soft-remove: unassigns customers, hides the driver and blocks their login.
  const removeDriver = useMutation({
    mutationFn: () => driverApi.remove(id!),
    onSuccess: () => {
      enqueueSnackbar(t('driverDetails.removedToast'), { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      navigate('/drivers');
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  if (isLoading || !driver) return <Box sx={{ p: 3 }}>{t('common.loading')}</Box>;

  const assignedIds = new Set((driver.customers ?? []).map((c) => c.id));

  return (
    <Box>
      <PageHeader
        title={driver.name}
        subtitle={t('driverDetails.driverSubtitle', { mobile: driver.mobile })}
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<CampaignIcon />} onClick={() => setNotifyOpen(true)}>{t('driverDetails.notify')}</Button>
            <Button variant="contained" startIcon={<EditIcon />} onClick={() => navigate(`/drivers/${id}/edit`)}>{t('driverDetails.edit')}</Button>
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setConfirmRemove(true)}>{t('driverDetails.remove')}</Button>
          </Stack>
        }
      />

      <Dialog open={confirmRemove} onClose={() => setConfirmRemove(false)}>
        <DialogTitle>{t('driverDetails.removeTitle')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('driverDetails.removeBody', { name: driver.name })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRemove(false)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={() => removeDriver.mutate()} disabled={removeDriver.isPending}>
            {t('driverDetails.remove')}
          </Button>
        </DialogActions>
      </Dialog>

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t('driverDetails.profile')}</Typography>
              <Row label={t('common.status')} value={<StatusChip status={driver.status} />} />
              <Row label={t('driverDetails.rowMobile')} value={driver.mobile} />
              <Row label={t('driverDetails.rowZone')} value={driver.zone ?? '—'} />
              <Row label={t('driverDetails.rowVehicle')} value={driver.vehicle ? `${driver.vehicle.number}${driver.vehicle.type ? ` (${driver.vehicle.type})` : ''}` : '—'} />
              <Row label={t('driverDetails.rowLicense')} value={driver.licenseNumber ?? '—'} />
              <Row label={t('common.email')} value={driver.email ?? '—'} />
              <Row label={t('driverDetails.rowAssignedCustomers')} value={driver._count?.customers ?? driver.customers?.length ?? 0} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6">{t('driverDetails.assignedCustomers')}</Typography>
                <Button size="small" variant="contained" startIcon={<PersonAddIcon />} onClick={() => setAssignOpen(true)}>{t('driverDetails.assign')}</Button>
              </Stack>
              <Divider />
              <List dense>
                {(driver.customers ?? []).length === 0 && (
                  <Typography color="text.secondary" sx={{ py: 2 }}>{t('driverDetails.noCustomersAssigned')}</Typography>
                )}
                {(driver.customers ?? []).map((c) => (
                  <ListItem
                    key={c.id}
                    secondaryAction={
                      <IconButton edge="end" size="small" onClick={() => unassign.mutate(c.id)}><DeleteIcon fontSize="small" /></IconButton>
                    }
                  >
                    <ListItemText
                      primary={<>{c.name} {c.isPaused && <Chip size="small" color="warning" label={t('driverDetails.paused')} sx={{ ml: 1 }} />}</>}
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
        <DialogTitle>{t('driverDetails.assignCustomersTo', { name: driver.name })}</DialogTitle>
        <DialogContent>
          <TextField
            label={t('driverDetails.searchPlaceholder')} fullWidth size="small" sx={{ my: 1 }}
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
                      secondary={`${c.mobile}${c.area ? ` · ${c.area}` : ''}${already ? ` · ${t('driverDetails.alreadyAssigned')}` : ''}`}
                    />
                  </ListItem>
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            disabled={assign.isPending || Object.values(picked).every((v) => !v)}
            onClick={() => assign.mutate()}
          >
            {t('driverDetails.assignSelected')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notify driver dialog */}
      <Dialog open={notifyOpen} onClose={() => setNotifyOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('driverDetails.sendNotificationTo', { name: driver.name })}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label={t('driverDetails.title')} fullWidth value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
            <TextField label={t('driverDetails.message')} fullWidth multiline rows={3} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotifyOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" disabled={sendNote.isPending || !noteTitle || !noteBody} onClick={() => sendNote.mutate()}>{t('driverDetails.send')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
