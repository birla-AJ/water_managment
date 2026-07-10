import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

// The ConfirmationResult from signInWithPhoneNumber is non-serialisable, so it
// can't be passed through navigation params — we hold it here between screens.
let confirmation: FirebaseAuthTypes.ConfirmationResult | null = null;

function logFirebaseAuth(step: string, data?: Record<string, unknown>) {
  if (__DEV__) console.log(`[WaterFlow Firebase Auth] ${step}`, data ?? {});
}

function logFirebaseAuthError(step: string, err: unknown) {
  const e = err as { code?: string; message?: string; nativeErrorMessage?: string; userInfo?: unknown };
  if (__DEV__) {
    console.log(`[WaterFlow Firebase Auth] ${step} failed`, {
      code: e?.code,
      message: e?.message,
      nativeErrorMessage: e?.nativeErrorMessage,
      userInfo: e?.userInfo,
    });
  }
}

/** Send an OTP SMS via Firebase to a 10-digit Indian number. */
export async function sendPhoneOtp(mobile: string): Promise<void> {
  const phoneNumber = `+91${mobile}`;
  logFirebaseAuth('sending OTP', {
    phoneNumber,
    currentUser: auth().currentUser?.uid ?? null,
    appVerificationDisabledForTesting: auth().settings.appVerificationDisabledForTesting,
  });
  try {
    confirmation = await auth().signInWithPhoneNumber(phoneNumber);
    logFirebaseAuth('OTP request success', {
      verificationIdAvailable: Boolean(confirmation.verificationId),
    });
  } catch (err) {
    logFirebaseAuthError('OTP request', err);
    throw err;
  }
}

/** Confirm the entered code and return a fresh Firebase ID token for the backend. */
export async function confirmPhoneOtp(code: string): Promise<string> {
  if (!confirmation) throw new Error('No OTP request in progress. Please request a new code.');
  logFirebaseAuth('confirming OTP', {
    codeLength: code.length,
    verificationIdAvailable: Boolean(confirmation.verificationId),
  });
  try {
    await confirmation.confirm(code);
    const user = auth().currentUser;
    logFirebaseAuth('OTP confirm success', {
      uid: user?.uid ?? null,
      phoneNumber: user?.phoneNumber ?? null,
    });
    const token = await user?.getIdToken(true);
    if (!token) throw new Error('Could not retrieve Firebase token. Please try again.');
    logFirebaseAuth('Firebase token ready', { tokenLength: token.length });
    return token;
  } catch (err) {
    logFirebaseAuthError('OTP confirm', err);
    throw err;
  }
}
