import { useState, type ReactNode } from 'react';
import { Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, Divider, Stack, Typography } from '@mui/material';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout } from '../features/auth/authSlice';
import PageHeader from '../components/PageHeader';
import { BRAND_GRADIENT, BRAND_GRADIENT_SOFT } from '../theme/theme';

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1.4 }}>
      <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: 'rgba(5,81,82,.08)', color: 'primary.main', display: 'grid', placeItems: 'center' }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ letterSpacing: .7, textTransform: 'uppercase' }}>{label}</Typography>
        <Typography variant="body2" fontWeight={700} noWrap>{value}</Typography>
      </Box>
    </Stack>
  );
}

export default function Profile() {
  const user = useAppSelector((s) => s.auth.user);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const role = user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Administrator';

  return (
    <Box>
      <PageHeader title={t('profile.title')} subtitle="Account and workspace settings" />
      <Stack spacing={1.5} sx={{ maxWidth: 620, mx: 'auto', pb: 4 }}>
        <Stack alignItems="center" spacing={0.8} sx={{ pt: 1.5, pb: 1 }}>
          <Box sx={{ width: 82, height: 82, borderRadius: '50%', display: 'grid', placeItems: 'center', background: BRAND_GRADIENT, color: '#fff', boxShadow: '0 14px 30px -16px rgba(5,81,82,.8)' }}>
            <AccountCircleOutlinedIcon sx={{ fontSize: 50 }} />
          </Box>
          <Typography variant="h5" textAlign="center">{user?.name ?? 'Administrator'}</Typography>
          <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
          <Chip icon={<AdminPanelSettingsOutlinedIcon />} label={role} size="small" sx={{ fontWeight: 800, color: 'primary.main', bgcolor: BRAND_GRADIENT_SOFT }} />
        </Stack>

        <Card sx={{ borderLeft: '3px solid', borderLeftColor: 'primary.main' }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={800}>ABOUT YOU</Typography>
            </Box>
            <Box sx={{ px: 2.5 }}>
              <InfoRow icon={<AccountCircleOutlinedIcon fontSize="small" />} label="Name" value={user?.name ?? '—'} />
              <Divider />
              <InfoRow icon={<EmailOutlinedIcon fontSize="small" />} label="Email" value={user?.email ?? '—'} />
              <Divider />
              <InfoRow icon={<PhoneOutlinedIcon fontSize="small" />} label="Mobile number" value={user?.mobile ?? user?.phone ?? 'Not added'} />
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ borderLeft: '3px solid', borderLeftColor: 'primary.main' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>WORKSPACE</Typography>
            <Stack spacing={1}>
              <Button fullWidth variant="outlined" startIcon={<AssessmentOutlinedIcon />} onClick={() => navigate('/reports')} sx={{ justifyContent: 'flex-start', py: 1.15 }}>Reports</Button>
              <Button fullWidth variant="outlined" startIcon={<SettingsOutlinedIcon />} onClick={() => navigate('/settings')} sx={{ justifyContent: 'flex-start', py: 1.15 }}>Settings</Button>
            </Stack>
          </CardContent>
        </Card>

        <Button color="error" startIcon={<LogoutIcon />} onClick={() => setConfirmLogout(true)} sx={{ alignSelf: 'center', mt: .5 }}>
          {t('nav.logout')}
        </Button>
      </Stack>

      <Dialog open={confirmLogout} onClose={() => setConfirmLogout(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
        <DialogContent sx={{ pt: 3.5, textAlign: 'center' }}>
          <Box sx={{ width: 58, height: 58, mx: 'auto', mb: 1.75, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: 'rgba(211,47,47,.1)', color: 'error.main' }}>
            <WarningAmberRoundedIcon fontSize="large" />
          </Box>
          <Typography variant="h6" fontWeight={800}>Log out of WaterFlow?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>You will need to sign in again to access your dashboard.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button fullWidth variant="outlined" onClick={() => setConfirmLogout(false)}>Cancel</Button>
          <Button fullWidth variant="contained" color="error" onClick={() => dispatch(logout())}>Log out</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
