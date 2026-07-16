import { Box, Card, CardContent, Stack, Avatar, Typography, Button, Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout } from '../features/auth/authSlice';
import PageHeader from '../components/PageHeader';
import WhatsAppConnectionCard from '../components/WhatsAppConnectionCard';

export default function Profile() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  return (
    <Box>
      <PageHeader title={t('profile.title')} />
      <Stack spacing={2}>
        <Card sx={{ maxWidth: 500, width: '100%' }}>
          <CardContent>
            <Stack spacing={2} alignItems="center">
              <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: 32 }}>{user?.name?.[0]?.toUpperCase()}</Avatar>
              <Typography variant="h6">{user?.name}</Typography>
              <Typography color="text.secondary">{user?.email}</Typography>
              <Typography variant="body2" color="primary">{user?.role}</Typography>
              <Divider sx={{ width: '100%' }} />
              <Button variant="outlined" color="error" onClick={() => dispatch(logout())}>{t('nav.logout')}</Button>
            </Stack>
          </CardContent>
        </Card>
        <WhatsAppConnectionCard />
      </Stack>
    </Box>
  );
}
