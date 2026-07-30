export type RootStackParamList = {
  Splash: undefined;
  OtpLogin: undefined;
  OtpVerify: { mobile: string };
  CompleteProfile: undefined;
  Main: undefined;
  OrderCamper: undefined;
  OrderHistory: undefined;
  Billing: undefined;
  PaymentHistory: undefined;
  Notifications: undefined;
  TrackDelivery: undefined;
  Support: undefined;
  DeliveryCalendar: { view?: 'week' | 'month' } | undefined;
  // Driver area
  DriverMain: undefined;
  DriverNotifications: undefined;
  // Admin area
  AdminMain: undefined;
};
