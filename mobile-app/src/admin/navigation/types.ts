// Shared route map for every stack in the admin section. Each bottom tab mounts
// its own native stack but they all draw from this one param list.
export type AdminStackParamList = {
  Tabs: undefined;
  Dashboard: undefined;
  Customers: undefined;
  CustomerDetails: { id: string };
  CustomerForm: { id?: string };
  Orders: undefined;
  More: undefined;
  Drivers: undefined;
  DriverDetails: { id: string };
  DriverForm: { id?: string };
  Vehicles: undefined;
  Inventory: undefined;
  Billing: undefined;
  Payments: undefined;
  Notifications: undefined;
  Reports: undefined;
  Settings: undefined;
  Profile: undefined;
  Expenses: undefined;
  ServiceAreas: undefined;
  Admins: undefined;
  AdminDetails: { id: string };
  LiveTracking: undefined;
};
