import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Grid, Typography, Stack, Button, Chip, Divider, Avatar,
  List, ListItem, ListItemText, CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { adminApi } from '../api/endpoints';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import StatusChip from '../components/StatusChip';
import { useTranslation } from 'react-i18next';

const AXIS = { fontSize: 12, fill: '#7C9A91' };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.75 }}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography fontWeight={600} component="div">{value}</Typography>
    </Stack>
  );
}

export default function AdminDetails() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: admin, isLoading } = useQuery({ queryKey: ['admin', id], queryFn: () => adminApi.get(id!) });
  const { data: customers } = useQuery({ queryKey: ['admin-customers', id], queryFn: () => adminApi.customers(id!) });

  const list = customers ?? [];
  const stats = useMemo(() => {
    const active = list.filter((c) => c.status === 'ACTIVE').length;
    const paused = list.filter((c) => c.isPaused).length;
    return { total: list.length, active, inactive: list.length - active, paused };
  }, [list]);

  // Customers added per month for the last 6 months.
  const growth = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) buckets[dayjs().subtract(i, 'month').format('MMM YY')] = 0;
    list.forEach((c) => {
      const key = dayjs(c.createdAt).format('MMM YY');
      if (key in buckets) buckets[key] += 1;
    });
    return Object.entries(buckets).map(([month, count]) => ({ month, count }));
  }, [list]);

  if (isLoading || !admin) {
    return <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <PageHeader
        title={admin.name}
        subtitle={admin.email}
        action={<Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/admins')}>{t('adminDetails.backToAdmins')}</Button>}
      />

      <Grid container spacing={2}>
        {/* Profile */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 24, fontWeight: 800 }}>
                  {admin.name?.[0]?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={800}>{admin.name}</Typography>
                  <Chip size="small" label={admin.role === 'SUPER_ADMIN' ? t('adminDetails.superAdmin') : t('adminDetails.admin')} color={admin.role === 'SUPER_ADMIN' ? 'secondary' : 'default'} />
                </Box>
              </Stack>
              <Divider sx={{ mb: 1.5 }} />
              <Row label={t('common.email')} value={admin.email} />
              <Row label={t('common.mobile')} value={admin.mobile ?? '—'} />
              <Row label={t('settings.phone')} value={admin.phone ?? '—'} />
              <Row label={t('common.status')} value={<StatusChip status={admin.isActive === false ? 'INACTIVE' : 'ACTIVE'} />} />
              <Row label={t('adminDetails.rowLastLogin')} value={admin.lastLoginAt ? dayjs(admin.lastLoginAt).format('DD MMM YYYY HH:mm') : t('adminDetails.never')} />
              <Row label={t('adminDetails.rowCreated')} value={admin.createdAt ? dayjs(admin.createdAt).format('DD MMM YYYY') : '—'} />
            </CardContent>
          </Card>
        </Grid>

        {/* Stats + growth */}
        <Grid item xs={12} md={7}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}><StatCard title={t('adminDetails.totalCustomers')} value={stats.total} icon={<PeopleIcon />} color="#055152" /></Grid>
            <Grid item xs={6} sm={3}><StatCard title={t('adminDetails.active')} value={stats.active} icon={<CheckCircleIcon />} color="#179A33" /></Grid>
            <Grid item xs={6} sm={3}><StatCard title={t('adminDetails.inactive')} value={stats.inactive} color="#7C9A91" /></Grid>
            <Grid item xs={6} sm={3}><StatCard title={t('adminDetails.paused')} value={stats.paused} icon={<PauseCircleIcon />} color="#C68A3E" /></Grid>
          </Grid>
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>{t('adminDetails.growthChartTitle')}</Typography>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={growth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(125,154,145,0.16)" />
                  <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#055152" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Customer list (this admin only) */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={1}>{t('adminDetails.customersManagedBy', { name: admin.name, count: stats.total })}</Typography>
              <Divider sx={{ mb: 1 }} />
              {list.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 3 }}>{t('adminDetails.noCustomers')}</Typography>
              ) : (
                <List dense>
                  {list.map((c) => (
                    <ListItem key={c.id} divider secondaryAction={<StatusChip status={c.status} />}>
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <span>{c.name}</span>
                            <Chip size="small" label={c.customerType} />
                            {c.isPaused && <Chip size="small" color="warning" label={t('adminDetails.paused')} />}
                          </Stack>
                        }
                        secondary={`${c.mobile}${c.area ? ` · ${c.area}` : ''} · ${c.allocatedCampers} ${t('adminDetails.campersSuffix')} · ${t('adminDetails.joinedSuffix')} ${dayjs(c.createdAt).format('DD MMM YYYY')}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
