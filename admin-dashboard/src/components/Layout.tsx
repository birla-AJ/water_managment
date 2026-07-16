import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AppBar, Box, Drawer, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Toolbar, Typography, Avatar, Menu, MenuItem, Badge, Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentsIcon from '@mui/icons-material/Payments';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import TranslateIcon from '@mui/icons-material/Translate';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import { useQuery } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout } from '../features/auth/authSlice';
import { notificationApi } from '../api/endpoints';
import { useLanguage } from '../hooks/useLanguage';
import LanguageSelectModal from './LanguageSelectModal';
import { BRAND_GRADIENT, BRAND_GRADIENT_SOFT } from '../theme/theme';
import AdminAiChat from './ai/AdminAiChat';

const DRAWER_WIDTH = 260;

// labelKey → i18n key under the "nav" namespace.
const NAV = [
  { labelKey: 'nav.dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { labelKey: 'nav.customers', path: '/customers', icon: <PeopleIcon /> },
  { labelKey: 'nav.drivers', path: '/drivers', icon: <LocalShippingIcon /> },
  { labelKey: 'nav.vehicles', path: '/vehicles', icon: <DirectionsCarIcon /> },
  { labelKey: 'nav.liveTracking', path: '/live-tracking', icon: <MapOutlinedIcon /> },
  { labelKey: 'nav.orders', path: '/orders', icon: <ShoppingCartIcon /> },
  { labelKey: 'nav.inventory', path: '/inventory', icon: <Inventory2Icon /> },
  { labelKey: 'nav.billing', path: '/billing', icon: <ReceiptIcon /> },
  { labelKey: 'nav.payments', path: '/payments', icon: <PaymentsIcon /> },
  { labelKey: 'nav.notifications', path: '/notifications', icon: <NotificationsIcon /> },
  { labelKey: 'nav.reports', path: '/reports', icon: <AssessmentIcon /> },
  { labelKey: 'nav.settings', path: '/settings', icon: <SettingsIcon /> },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [langModalOpen, setLangModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { current: lang, change: changeLanguage } = useLanguage();
  const user = useAppSelector((s) => s.auth.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  // Super admins only manage admins; regular admins get the operational nav.
  const nav = isSuperAdmin
    ? [
        { labelKey: 'nav.admins', path: '/admins', icon: <AdminPanelSettingsIcon /> },
        { labelKey: 'nav.serviceAreas', path: '/service-areas', icon: <PlaceOutlinedIcon /> },
        { labelKey: 'nav.liveTracking', path: '/live-tracking', icon: <MapOutlinedIcon /> },
      ]
    : NAV;
  const softGrad = BRAND_GRADIENT_SOFT;

  // Apply the saved language and prompt once (first login on this device/account).
  useEffect(() => {
    if (!user) return;
    if (user.language && user.language !== lang) changeLanguage(user.language);
    const flag = `wf_lang_chosen:${user.id}`;
    if (!localStorage.getItem(flag)) setLangModalOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const closeLangModal = () => {
    if (user) localStorage.setItem(`wf_lang_chosen:${user.id}`, '1');
    setLangModalOpen(false);
  };

  const { data: unread } = useQuery({
    queryKey: ['unread'],
    queryFn: notificationApi.unreadCount,
    refetchInterval: 30_000,
    enabled: !isSuperAdmin, // super admins don't use notifications
  });

  const activeKey = nav.find((n) => location.pathname.startsWith(n.path))?.labelKey ?? 'nav.dashboard';
  const activeLabel = t(activeKey);
  const drawerBg = '#FFFDF9';

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: drawerBg }}>
      <Toolbar sx={{ gap: 1.25, px: 2.5, py: 3 }}>
        <Box
          sx={{
            background: BRAND_GRADIENT,
            color: '#FFFFFF',
            width: 42,
            height: 42,
            borderRadius: 2.5,
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 8px 18px -6px rgba(5,81,82,0.55)',
          }}
        >
          <WaterDropIcon />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={800} lineHeight={1.1} letterSpacing={0.5}>
            WaterFlow
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 1.5 }}>
            ERP ADMIN
          </Typography>
        </Box>
      </Toolbar>

      <List sx={{ px: 1.5, flexGrow: 1 }}>
        {nav.map((item) => {
          const active = location.pathname.startsWith(item.path);
          return (
            <ListItemButton
              key={item.path}
              selected={active}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              sx={{
                borderRadius: 2.5,
                my: 0.4,
                py: 1.05,
                position: 'relative',
                overflow: 'hidden',
                transition: 'background-color .2s ease, transform .15s ease, box-shadow .2s ease, color .15s ease',
                '&:hover': {
                  transform: 'translateX(4px)',
                  backgroundColor: 'rgba(5,81,82,0.07)',
                  color: 'primary.main',
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                },
                '&.Mui-selected, &.Mui-selected:hover': {
                  background: softGrad,
                  color: 'primary.main',
                  boxShadow: 'inset 0 0 0 1px rgba(5,81,82,0.18)',
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                  '& .MuiListItemText-primary': { fontWeight: 800 },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: 28,
                    width: 4,
                    borderRadius: 4,
                    background: BRAND_GRADIENT,
                  },
                },
              }}
            >
              <ListItemIcon sx={{ color: active ? 'primary.main' : 'text.secondary', minWidth: 40 }}>
                {item.path === '/notifications' ? (
                  <Badge color="error" badgeContent={unread ?? 0}>{item.icon}</Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText primary={t(item.labelKey)} primaryTypographyProps={{ fontSize: 14.5 }} />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ p: 2 }}>
        <Box sx={{ background: softGrad, border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 1.5, display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Avatar sx={{ background: BRAND_GRADIENT, color: '#FFFFFF', width: 36, height: 36, fontWeight: 800 }}>
            {user?.name?.[0]?.toUpperCase() ?? 'A'}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>{user?.name ?? 'Admin'}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {user?.email}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'rgba(255,253,249,0.78)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 1, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={800} sx={{ display: { xs: 'none', sm: 'block' } }}>
            {activeLabel}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title={`${t('language.label')}: ${lang === 'hi' ? 'हिंदी' : 'English'}`}>
            <IconButton onClick={() => changeLanguage(lang === 'hi' ? 'en' : 'hi')} sx={{ mr: 0.5 }}>
              <TranslateIcon />
              <Typography component="span" variant="caption" sx={{ ml: 0.5, fontWeight: 700 }}>
                {lang === 'hi' ? 'हि' : 'EN'}
              </Typography>
            </IconButton>
          </Tooltip>
          {!isSuperAdmin && (
            <Tooltip title={t('nav.notifications')}>
              <IconButton onClick={() => navigate('/notifications')} sx={{ mr: 0.5 }}>
                <Badge color="error" badgeContent={unread ?? 0}>
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          )}
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ background: BRAND_GRADIENT, color: '#FFFFFF', width: 38, height: 38, fontWeight: 800 }}>
              {user?.name?.[0]?.toUpperCase() ?? 'A'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={!!anchorEl}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              sx: {
                mt: 1.2,
                minWidth: 250,
                borderRadius: 3,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: '0 18px 44px -18px rgba(5,81,82,0.35)',
              },
            }}
            MenuListProps={{ sx: { p: 1 } }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                p: 1.5,
                mb: 0.5,
                borderRadius: 2.5,
                background: softGrad,
              }}
            >
              <Avatar sx={{ background: BRAND_GRADIENT, color: '#FFFFFF', width: 42, height: 42, fontWeight: 800 }}>
                {user?.name?.[0]?.toUpperCase() ?? 'A'}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={800} noWrap>{user?.name ?? 'Admin'}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{user?.email}</Typography>
              </Box>
            </Box>

            <MenuItem
              onClick={() => { setAnchorEl(null); navigate('/profile'); }}
              sx={{ borderRadius: 2, py: 1, mb: 0.25, '&:hover .MuiListItemIcon-root': { color: 'primary.main' } }}
            >
              <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon> {t('nav.profile')}
            </MenuItem>
            <MenuItem
              onClick={() => dispatch(logout())}
              sx={{
                borderRadius: 2,
                py: 1,
                color: 'error.main',
                '&:hover': {
                  bgcolor: 'rgba(211,47,47,0.09)',
                  color: 'error.main',
                  '& .MuiListItemIcon-root': { color: 'error.main' },
                },
              }}
            >
              <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon> {t('nav.logout')}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none' } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, borderRight: '1px solid', borderColor: 'divider' },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, minHeight: '100vh' }}>
        <Toolbar />
        <Outlet />
      </Box>
      <AdminAiChat />
      <LanguageSelectModal open={langModalOpen} onClose={closeLangModal} />
    </Box>
  );
}
