import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { whatsappApi } from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import StatusChip from './StatusChip';

// Per-admin WhatsApp linking. Shows a connected/offline badge and a QR dialog to
// link (or re-link) the admin's own WhatsApp number. Messages to this admin's
// customers (OTP, bills, reminders) are sent from the linked number.
export default function WhatsAppConnectionCard() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  const statusQ = useQuery({
    queryKey: ['wa-status'],
    queryFn: whatsappApi.status,
    refetchInterval: 5000,
    retry: false,
  });

  const connected = statusQ.data?.connected ?? false;

  // While the dialog is open, poll the QR/status until it flips to connected.
  const qrQ = useQuery({
    queryKey: ['wa-qr', accountId],
    queryFn: () => whatsappApi.qr(accountId as string),
    enabled: dialogOpen && !!accountId,
    refetchInterval: 3000,
    retry: false,
  });

  useEffect(() => {
    if (qrQ.data?.qr) setQr(qrQ.data.qr);
    if (qrQ.data?.status === 'connected') {
      setDialogOpen(false);
      enqueueSnackbar(t('whatsapp.connectedToast'), { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['wa-status'] });
    }
  }, [qrQ.data, enqueueSnackbar, qc]);

  const connect = useMutation({
    mutationFn: whatsappApi.connect,
    onSuccess: (data) => {
      setAccountId(data.accountId);
      setQr(data.qr);
      setDialogOpen(true);
      if (data.status === 'connected') {
        setDialogOpen(false);
        enqueueSnackbar(t('whatsapp.connectedToast'), { variant: 'success' });
        qc.invalidateQueries({ queryKey: ['wa-status'] });
      }
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  const disconnect = useMutation({
    mutationFn: whatsappApi.logout,
    onSuccess: () => {
      enqueueSnackbar(t('whatsapp.disconnectedToast'), { variant: 'info' });
      qc.invalidateQueries({ queryKey: ['wa-status'] });
    },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  return (
    <Card sx={{ maxWidth: 500, width: '100%' }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <WhatsAppIcon sx={{ color: '#25D366' }} />
              <Typography variant="h6">{t('whatsapp.title')}</Typography>
            </Stack>
            {statusQ.isLoading ? (
              <CircularProgress size={18} />
            ) : (
              <StatusChip status={connected ? 'CONNECTED' : 'OFFLINE'} label={connected ? t('whatsapp.connected') : t('whatsapp.offline')} />
            )}
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {t('whatsapp.description')}
          </Typography>

          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              onClick={() => connect.mutate()}
              disabled={connect.isPending}
              startIcon={connect.isPending ? <CircularProgress size={16} color="inherit" /> : <WhatsAppIcon />}
            >
              {connected ? t('whatsapp.reconnect') : t('whatsapp.link')}
            </Button>
            {connected && (
              <Button
                variant="outlined"
                color="error"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
              >
                {t('whatsapp.disconnect')}
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContent>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('whatsapp.dialogTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} alignItems="center" sx={{ py: 1 }}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {t('whatsapp.scanHint')}
            </Typography>
            {qr ? (
              <Box component="img" src={qr} alt="WhatsApp QR" sx={{ width: 256, height: 256 }} />
            ) : (
              <Stack alignItems="center" spacing={1} sx={{ py: 4 }}>
                <CircularProgress />
                <Typography variant="caption" color="text.secondary">
                  {t('whatsapp.generatingQr')}
                </Typography>
              </Stack>
            )}
            <StatusChip
              status={qrQ.data?.status === 'connected' ? 'CONNECTED' : 'PENDING'}
              label={qrQ.data?.status === 'connected' ? t('whatsapp.connected') : undefined}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
