import { Box, Card, List, ListItem, ListItemText, Chip, Button, Stack, Typography, Avatar } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PaymentsIcon from '@mui/icons-material/Payments';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ReceiptIcon from '@mui/icons-material/Receipt';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { ReactNode } from 'react';
import { notificationApi } from '../api/endpoints';
import PageHeader from '../components/PageHeader';
import { useTranslation } from 'react-i18next';

// Map a notification type to an icon + accent colour (best-effort by keyword).
function visualFor(type: string): { icon: ReactNode; color: string } {
  const t = (type ?? '').toUpperCase();
  if (t.includes('NEW_CUSTOMER')) return { icon: <PersonAddAlt1Icon />, color: '#0E6BA8' };
  if (t.includes('ORDER')) return { icon: <ShoppingCartIcon />, color: '#055152' };
  if (t.includes('PAY')) return { icon: <PaymentsIcon />, color: '#179A33' };
  if (t.includes('DELIV')) return { icon: <LocalShippingIcon />, color: '#0E8C84' };
  if (t.includes('BILL') || t.includes('INVOICE')) return { icon: <ReceiptIcon />, color: '#C68A3E' };
  if (t.includes('INVENT') || t.includes('STOCK')) return { icon: <Inventory2Icon />, color: '#DABD71' };
  return { icon: <NotificationsActiveIcon />, color: '#7C9A91' };
}

export default function Notifications() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['notifications'], queryFn: () => notificationApi.list({ limit: 100 }) });

  const markAll = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['unread'] }); },
  });

  const markOne = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['unread'] }); },
  });

  // Only unread notifications are shown; reading one (or all) removes it from the list.
  const items = (data?.data ?? []).filter((n: any) => !n.isRead);
  const unreadCount = items.length;

  return (
    <Box>
      <PageHeader
        title={t('nav.notifications')}
        subtitle={unreadCount ? t('notificationsPage.unreadCount', { count: unreadCount }) : t('notificationsPage.allCaughtUp')}
        action={<Button variant="outlined" disabled={!unreadCount} onClick={() => markAll.mutate()}>{t('notificationsPage.markAllRead')}</Button>}
      />
      <Card>
        <List disablePadding>
          {items.map((n: any, i: number) => {
            const v = visualFor(n.type);
            return (
              <ListItem
                key={n.id}
                divider={i < items.length - 1}
                secondaryAction={
                  !n.isRead && (
                    <Button size="small" onClick={() => markOne.mutate(n.id)}>{t('notificationsPage.markRead')}</Button>
                  )
                }
                sx={{
                  py: 1.75,
                  px: 2.5,
                  position: 'relative',
                  bgcolor: n.isRead ? 'transparent' : 'rgba(45,212,191,0.07)',
                  '&::before': n.isRead
                    ? {}
                    : {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 4,
                        background: v.color,
                      },
                }}
              >
                <Avatar
                  sx={{
                    mr: 2,
                    width: 42,
                    height: 42,
                    bgcolor: `${v.color}1A`,
                    color: v.color,
                  }}
                >
                  {v.icon}
                </Avatar>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography fontWeight={n.isRead ? 600 : 700}>{n.title}</Typography>
                      <Chip size="small" label={String(n.type ?? '').replace(/_/g, ' ')} sx={{ bgcolor: `${v.color}1A`, color: v.color }} />
                    </Stack>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      {n.body} · {dayjs(n.createdAt).format('DD MMM YYYY, HH:mm')}
                    </Typography>
                  }
                />
              </ListItem>
            );
          })}

          {!items.length && (
            <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
              <NotificationsOffIcon sx={{ fontSize: 56, opacity: 0.4 }} />
              <Typography sx={{ mt: 1 }} fontWeight={600}>{t('notificationsPage.emptyTitle')}</Typography>
              <Typography variant="body2">{t('notificationsPage.emptySubtitle')}</Typography>
            </Box>
          )}
        </List>
      </Card>
    </Box>
  );
}
