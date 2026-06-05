import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from './app/hooks';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerForm from './pages/CustomerForm';
import CustomerDetails from './pages/CustomerDetails';
import Drivers from './pages/Drivers';
import DriverForm from './pages/DriverForm';
import DriverDetails from './pages/DriverDetails';
import Vehicles from './pages/Vehicles';
import Orders from './pages/Orders';
import Inventory from './pages/Inventory';
import Billing from './pages/Billing';
import Payments from './pages/Payments';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = useAppSelector((s) => s.auth.accessToken);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/new" element={<CustomerForm />} />
        <Route path="customers/:id/edit" element={<CustomerForm />} />
        <Route path="customers/:id" element={<CustomerDetails />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="drivers/new" element={<DriverForm />} />
        <Route path="drivers/:id/edit" element={<DriverForm />} />
        <Route path="drivers/:id" element={<DriverDetails />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="orders" element={<Orders />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="billing" element={<Billing />} />
        <Route path="payments" element={<Payments />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
