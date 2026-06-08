import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, TextField, Button, Typography, Stack, InputAdornment, Divider } from '@mui/material';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import { useSnackbar } from 'notistack';
import { authApi } from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { setCredentials } from '../features/auth/authSlice';
import { BRAND_GRADIENT } from '../theme/theme';

type Mode = 'email' | 'otp';

export default function Login() {
  const [mode, setMode] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const token = useAppSelector((s) => s.auth.accessToken);
  if (token) navigate('/');

  const finishLogin = (res: { accessToken: string; refreshToken: string; user: { role?: string } }) => {
    // Only admins may use this dashboard — reject customer/driver tokens.
    if (res.user?.role !== 'ADMIN' && res.user?.role !== 'SUPER_ADMIN') {
      enqueueSnackbar('This number is not registered as an admin.', { variant: 'error' });
      return;
    }
    dispatch(setCredentials({ accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user as never }));
    enqueueSnackbar('Welcome back!', { variant: 'success' });
    // Super admins land on the Admins screen; regular admins on the dashboard.
    navigate(res.user?.role === 'SUPER_ADMIN' ? '/admins' : '/dashboard');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      finishLogin(res);
    } catch (err) {
      enqueueSnackbar(apiErrorMessage(err), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.requestOtp(mobile);
      setOtpSent(true);
      enqueueSnackbar(res?.devOtp ? `OTP: ${res.devOtp} (dev mode)` : 'OTP sent', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(apiErrorMessage(err), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(mobile, otp);
      finishLogin(res);
    } catch (err) {
      enqueueSnackbar(apiErrorMessage(err), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(1100px 600px at 12% -8%, #0F766E 0%, transparent 55%), radial-gradient(900px 500px at 95% 110%, #134E4A 0%, transparent 55%), linear-gradient(135deg, #0B1A16 0%, #0D9488 60%, #22D3EE 130%)',
      }}
    >
      {/* decorative blobs */}
      <Box sx={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', top: -80, right: -60 }} />
      <Box sx={{ position: 'absolute', width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.10)', bottom: -70, left: -40 }} />

      <Card sx={{ width: 420, maxWidth: '94vw', borderRadius: 4, position: 'relative', boxShadow: '0 30px 60px -20px rgba(2,6,23,0.5)' }}>
        <CardContent sx={{ p: { xs: 3, sm: 4.5 } }}>
          <Stack alignItems="center" spacing={1.5} mb={3.5}>
            <Box
              sx={{
                background: BRAND_GRADIENT,
                color: '#fff',
                width: 64,
                height: 64,
                borderRadius: 4,
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 14px 28px -10px rgba(37,99,235,0.7)',
              }}
            >
              <WaterDropIcon sx={{ fontSize: 36 }} />
            </Box>
            <Typography variant="h5" fontWeight={800}>WaterFlow ERP</Typography>
            <Typography variant="body2" color="text.secondary">Sign in to your admin dashboard</Typography>
          </Stack>

          {mode === 'email' ? (
            <>
              <form onSubmit={submit}>
                <Stack spacing={2.25}>
                  <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    required
                    autoFocus
                    InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlinedIcon fontSize="small" /></InputAdornment> }}
                  />
                  <TextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    required
                    InputProps={{ startAdornment: <InputAdornment position="start"><LockOutlinedIcon fontSize="small" /></InputAdornment> }}
                  />
                  <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ py: 1.3, mt: 0.5 }}>
                    {loading ? 'Signing in…' : 'Sign In'}
                  </Button>
                </Stack>
              </form>

              <Divider sx={{ my: 2.5 }}>or</Divider>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<PhoneIphoneIcon fontSize="small" />}
                onClick={() => { setMode('otp'); setOtpSent(false); }}
              >
                Login with mobile OTP
              </Button>
            </>
          ) : (
            <>
              <form onSubmit={otpSent ? verifyOtp : sendOtp}>
                <Stack spacing={2.25}>
                  <TextField
                    label="Mobile Number"
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    fullWidth
                    required
                    disabled={otpSent}
                    placeholder="10-digit mobile"
                    InputProps={{ startAdornment: <InputAdornment position="start">+91</InputAdornment> }}
                  />
                  {otpSent && (
                    <TextField
                      label="OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      fullWidth
                      required
                      autoFocus
                      placeholder="Enter the code"
                      InputProps={{ startAdornment: <InputAdornment position="start"><LockOutlinedIcon fontSize="small" /></InputAdornment> }}
                    />
                  )}
                  <Button type="submit" variant="contained" size="large" disabled={loading || mobile.length !== 10} sx={{ py: 1.3, mt: 0.5 }}>
                    {loading ? 'Please wait…' : otpSent ? 'Verify & Sign In' : 'Send OTP'}
                  </Button>
                  {otpSent && (
                    <Button variant="text" size="small" onClick={() => setOtpSent(false)} disabled={loading}>
                      Change number
                    </Button>
                  )}
                </Stack>
              </form>

              <Divider sx={{ my: 2.5 }}>or</Divider>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<EmailOutlinedIcon fontSize="small" />}
                onClick={() => { setMode('email'); setOtpSent(false); }}
              >
                Back to email login
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
