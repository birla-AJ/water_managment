import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Grid, TextField, Button, Typography, Stack } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { settingsApi } from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { data } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.getAll });

  const [business, setBusiness] = useState<Record<string, string>>({});
  const [billing, setBilling] = useState<Record<string, number>>({});

  useEffect(() => {
    if (data) {
      setBusiness(data.business ?? {});
      setBilling(data.billing ?? {});
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      await settingsApi.update('business', business);
      await settingsApi.update('billing', billing);
    },
    onSuccess: () => { enqueueSnackbar(t('settings.savedToast'), { variant: 'success' }); qc.invalidateQueries({ queryKey: ['settings'] }); },
    onError: (e) => enqueueSnackbar(apiErrorMessage(e), { variant: 'error' }),
  });

  return (
    <Box>
      <PageHeader title={t('nav.settings')} subtitle={t('settings.subtitle')} />
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Typography variant="h6" mb={2}>{t('settings.business')}</Typography>
            <Stack spacing={2}>
              <TextField label={t('settings.businessName')} value={business.name ?? ''} onChange={(e) => setBusiness({ ...business, name: e.target.value })} />
              <TextField label={t('settings.gstin')} value={business.gstin ?? ''} onChange={(e) => setBusiness({ ...business, gstin: e.target.value })} />
              <TextField label={t('settings.phone')} value={business.phone ?? ''} onChange={(e) => setBusiness({ ...business, phone: e.target.value })} />
              <TextField label={t('common.email')} value={business.email ?? ''} onChange={(e) => setBusiness({ ...business, email: e.target.value })} />
              <TextField label={t('settings.address')} value={business.address ?? ''} onChange={(e) => setBusiness({ ...business, address: e.target.value })} />
            </Stack>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Typography variant="h6" mb={2}>{t('settings.billing')}</Typography>
            <Stack spacing={2}>
              <TextField label={t('settings.defaultRate')} type="number" value={billing.defaultRate ?? 0} onChange={(e) => setBilling({ ...billing, defaultRate: Number(e.target.value) })} />
              <TextField label={t('settings.taxPercent')} type="number" value={billing.taxPercent ?? 0} onChange={(e) => setBilling({ ...billing, taxPercent: Number(e.target.value) })} />
              <TextField label={t('settings.dueDays')} type="number" value={billing.dueDays ?? 7} onChange={(e) => setBilling({ ...billing, dueDays: Number(e.target.value) })} />
            </Stack>
          </CardContent></Card>
        </Grid>
      </Grid>
      <Button variant="contained" sx={{ mt: 3 }} onClick={() => save.mutate()} disabled={save.isPending}>{t('settings.saveSettings')}</Button>
    </Box>
  );
}
