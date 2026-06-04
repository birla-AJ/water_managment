import { Box, Card, CardContent, Stack, Avatar, Typography, Button, Divider } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout } from '../features/auth/authSlice';
import PageHeader from '../components/PageHeader';

export default function Profile() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();

  return (
    <Box>
      <PageHeader title="Profile" />
      <Card sx={{ maxWidth: 500 }}>
        <CardContent>
          <Stack spacing={2} alignItems="center">
            <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: 32 }}>{user?.name?.[0]?.toUpperCase()}</Avatar>
            <Typography variant="h6">{user?.name}</Typography>
            <Typography color="text.secondary">{user?.email}</Typography>
            <Typography variant="body2" color="primary">{user?.role}</Typography>
            <Divider sx={{ width: '100%' }} />
            <Button variant="outlined" color="error" onClick={() => dispatch(logout())}>Logout</Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
