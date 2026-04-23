import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private readonly enabled: boolean;

  constructor() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    this.enabled = Boolean(projectId && clientEmail && privateKey);

    if (!this.enabled) {
      this.logger.warn(
        'Firebase notifications are disabled. Missing FIREBASE_* environment variables.',
      );
      return;
    }

    const serviceAccount: ServiceAccount = {
      projectId,
      clientEmail,
      privateKey,
    };

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  }

  async sendNotification(token: string, title: string, body: string) {
    if (!this.enabled) {
      return { success: false, message: 'Firebase is not configured' };
    }

    if (!token?.trim()) {
      return { success: false, message: 'FCM token is required' };
    }

    const message: admin.messaging.Message = {
      notification: { title, body },
      token: token.trim(),
    };

    try {
      const response = await admin.messaging().send(message);
      return { success: true, response };
    } catch (error) {
      this.logger.error('Error sending Firebase notification', error as Error);
      return { success: false, error };
    }
  }

  async sendNotificationWithData(
    token: string,
    payload: {
      notification: {
        title: string;
        body: string;
      };
      data?: Record<string, string>;
    },
  ) {
    if (!this.enabled) {
      return { success: false, message: 'Firebase is not configured' };
    }

    if (!token?.trim()) {
      return { success: false, message: 'FCM token is required' };
    }

    const message: admin.messaging.Message = {
      token: token.trim(),
      notification: payload.notification,
      data: payload.data,
    };

    try {
      const response = await admin.messaging().send(message);
      return { success: true, response };
    } catch (error) {
      this.logger.error('Error sending Firebase notification', error as Error);
      return { success: false, error };
    }
  }
}
