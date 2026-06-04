import fs from 'fs';
import admin from 'firebase-admin';
import { env } from './env';
import { logger } from './logger';

let initialized = false;

/**
 * Lazily initialise the Firebase Admin SDK. If no credentials are configured
 * the app keeps running and push notifications are simply skipped (logged).
 */
export function getFirebaseAdmin(): typeof admin | null {
  if (initialized) return admin.apps.length ? admin : null;
  initialized = true;

  try {
    let serviceAccount: admin.ServiceAccount | null = null;

    if (env.firebase.serviceAccountInline) {
      serviceAccount = JSON.parse(env.firebase.serviceAccountInline);
    } else if (env.firebase.serviceAccountPath && fs.existsSync(env.firebase.serviceAccountPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(env.firebase.serviceAccountPath, 'utf-8'));
    }

    if (!serviceAccount) {
      logger.warn('⚠️  Firebase service account not configured — push notifications disabled.');
      return null;
    }

    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    logger.info('✅ Firebase Admin initialised');
    return admin;
  } catch (err) {
    logger.error(`Failed to initialise Firebase Admin: ${(err as Error).message}`);
    return null;
  }
}
