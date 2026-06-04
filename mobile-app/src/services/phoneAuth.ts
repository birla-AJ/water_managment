import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

// The ConfirmationResult from signInWithPhoneNumber is non-serialisable, so it
// can't be passed through navigation params — we hold it here between screens.
let confirmation: FirebaseAuthTypes.ConfirmationResult | null = null;

/** Send an OTP SMS via Firebase to a 10-digit Indian number. */
export async function sendPhoneOtp(mobile: string): Promise<void> {
  confirmation = await auth().signInWithPhoneNumber(`+91${mobile}`);
}

/** Confirm the entered code and return a fresh Firebase ID token for the backend. */
export async function confirmPhoneOtp(code: string): Promise<string> {
  if (!confirmation) throw new Error('No OTP request in progress. Please request a new code.');
  await confirmation.confirm(code);
  const token = await auth().currentUser?.getIdToken(true);
  if (!token) throw new Error('Could not retrieve Firebase token. Please try again.');
  return token;
}
