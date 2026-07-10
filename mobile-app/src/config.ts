// Live backend on AWS EC2. For local development against a local server,
// swap SERVER_HOST back to a Platform-based localhost value.
const SERVER_HOST = 'http://13.235.27.138:4000';

export const config = {
  serverHost: SERVER_HOST,
  apiUrl: `${SERVER_HOST}/api/v1`,
  googleMapsApiKey: 'AIzaSyBqtNNRlrJDPr392gapSx7VPk3BkTVjDrM',
  // Public Razorpay test key id (used as a fallback; the backend also returns
  // keyId with each created order). The secret lives only on the server.
  razorpayKeyId: 'rzp_test_Sz8gbOvNtgLNDm',
};

if (__DEV__) {
  console.log('[WaterFlow config]', {
    serverHost: config.serverHost,
    apiUrl: config.apiUrl,
  });
}
