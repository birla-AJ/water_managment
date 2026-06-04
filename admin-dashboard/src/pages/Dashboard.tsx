import { ReactNode } from 'react';
import { Grid, Card, CardContent, Typography, Box, CircularProgress, Stack, Grow } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import PaymentsIcon from '@mui/icons-material/Payments';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/endpoints';
import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';

const PIE_COLORS = ['#2DD4BF', '#22D3EE', '#34D399', '#D9E25A', '#F87171', '#38BDF8'];

const AXIS = { fontSize: 12, fill: '#7C9A91' };
const GRID = 'rgba(125,154,145,0.16)';
const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid rgba(45,212,191,0.25)',
  background: '#0E1B18',
  color: '#E6F2EE',
  boxShadow: '0 10px 28px -12px rgba(0,0,0,0.6)',
};

function ChartCard({ title, subtitle, children, accent = '#2DD4BF' }: { title: string; subtitle?: string; children: ReactNode; accent?: string }) {
  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden', '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, transparent)`, opacity: 0.8 } }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack sx={{ mb: 2 }}>
          <Typography variant="h6">{title}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.2} sx={{ mt: 3, mb: 1.5 }}>
      <Box sx={{ width: 4, height: 18, borderRadius: 2, background: 'linear-gradient(180deg, #2DD4BF, #22D3EE)' }} />
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1.5 }}>
        {children}
      </Typography>
    </Stack>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: o, isLoading } = useQuery({ queryKey: ['overview'], queryFn: dashboardApi.overview });
  const { data: charts } = useQuery({ queryKey: ['charts'], queryFn: dashboardApi.charts });

  if (isLoading || !o) {
    return <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}><CircularProgress /></Box>;
  }

  const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const go = (path: string) => () => navigate(path);

  // Each tile: what it shows + where a click takes the admin.
  const metrics = [
    { title: 'Total Customers', value: o.customers.total, icon: <PeopleIcon />, subtitle: `${o.customers.active} active · ${o.customers.inactive} inactive`, color: '#2DD4BF', to: '/customers' },
    { title: 'Total Orders', value: o.orders.total, icon: <ShoppingCartIcon />, subtitle: `${o.orders.today} today`, color: '#22D3EE', to: '/orders' },
    { title: 'Delivered', value: o.orders.delivered, icon: <LocalShippingIcon />, subtitle: `${o.orders.pending} pending`, color: '#34D399', to: '/orders' },
    { title: 'Monthly Revenue', value: inr(o.revenue.monthly), icon: <CurrencyRupeeIcon />, subtitle: `Total ${inr(o.revenue.total)}`, color: '#D9E25A', to: '/reports' },
  ];

  const payInv = [
    { title: 'Pending Payments', value: inr(o.payments.pending), icon: <PaymentsIcon />, color: '#F87171', to: '/billing', span: 3 },
    { title: 'Paid', value: inr(o.payments.paid), icon: <PaymentsIcon />, color: '#34D399', to: '/payments', span: 3 },
    { title: 'Filled Campers', value: o.inventory.filled, icon: <WaterDropIcon />, subtitle: `${o.inventory.empty} empty`, color: '#2DD4BF', to: '/inventory', span: 3 },
    { title: 'Total Campers', value: o.inventory.total, icon: <WaterDropIcon />, subtitle: `${o.orders.cancelled} cancelled orders`, color: '#14B8A6', to: '/inventory', span: 3 },
    { title: 'Damaged', value: o.inventory.damaged, color: '#D9E25A', to: '/inventory', span: 3, half: true },
    { title: 'Lost', value: o.inventory.lost, color: '#F87171', to: '/inventory', span: 3, half: true },
    { title: 'Returned', value: o.inventory.returned, color: '#22D3EE', to: '/inventory', span: 3, half: true },
    { title: 'Cancelled', value: o.orders.cancelled, color: '#7C9A91', to: '/orders', span: 3, half: true },
  ];

  return (
    <Box>
      <PageHeader title="Dashboard" subtitle="Overview of your water distribution business" />

      <SectionLabel>Key metrics</SectionLabel>
      <Grid container spacing={2.5}>
        {metrics.map((m, i) => (
          <Grid item xs={12} sm={6} md={3} key={m.title}>
            <Grow in timeout={500} style={{ transitionDelay: `${i * 70}ms` }}>
              <Box sx={{ height: '100%' }}>
                <StatCard title={m.title} value={m.value} icon={m.icon} color={m.color} subtitle={m.subtitle} onClick={go(m.to)} />
              </Box>
            </Grow>
          </Grid>
        ))}
      </Grid>

      <SectionLabel>Payments &amp; inventory</SectionLabel>
      <Grid container spacing={2.5}>
        {payInv.map((m, i) => (
          <Grid item xs={m.half ? 6 : 12} sm={m.half ? 3 : 6} md={3} key={m.title}>
            <Grow in timeout={500} style={{ transitionDelay: `${i * 60}ms` }}>
              <Box sx={{ height: '100%' }}>
                <StatCard title={m.title} value={m.value} icon={m.icon} color={m.color} subtitle={m.subtitle} onClick={go(m.to)} />
              </Box>
            </Grow>
          </Grid>
        ))}
      </Grid>

      <SectionLabel>Analytics</SectionLabel>
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={8}>
          <ChartCard title="Revenue" subtitle="Last 6 months" accent="#2DD4BF">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={charts?.revenue ?? []}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="revenue" stroke="#2DD4BF" strokeWidth={3} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <ChartCard title="Inventory" subtitle="Current camper status" accent="#22D3EE">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={charts?.inventory ?? []} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3} cornerRadius={6}>
                  {(charts?.inventory ?? []).map((_: unknown, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={7}>
          <ChartCard title="Orders" subtitle="Last 14 days" accent="#34D399">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={charts?.orders ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                <XAxis dataKey="date" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="circle" />
                <Bar dataKey="delivered" stackId="a" fill="#34D399" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pending" stackId="a" fill="#D9E25A" />
                <Bar dataKey="cancelled" stackId="a" fill="#F87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={5}>
          <ChartCard title="Customer Growth" subtitle="Cumulative by month" accent="#38BDF8">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={charts?.customerGrowth ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="count" stroke="#22D3EE" strokeWidth={3} dot={{ r: 3, fill: '#22D3EE' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}
