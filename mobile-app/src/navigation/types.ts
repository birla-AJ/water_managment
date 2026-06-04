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
  Support: undefined;
  SkipDeliveries: { view?: 'week' | 'month' } | undefined;
};
