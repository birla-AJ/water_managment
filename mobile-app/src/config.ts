// Live backend on AWS EC2. For local development against a local server,
// swap SERVER_HOST back to a Platform-based localhost value.
const SERVER_HOST = 'http://13.232.98.53:4000';

export const config = {
  apiUrl: `${SERVER_HOST}/api/v1`,
  razorpayKeyId: 'rzp_test_xxxxxxxx',
};
