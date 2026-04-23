import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import {
  UserSubscription,
  UserSubscriptionStatus,
} from './entities/user-subscription.entity';
import {
  BillingTransaction,
  BillingTransactionStatus,
} from './entities/billing-transaction.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { VerifyGoogleSubscriptionDto } from './dto/verify-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(UserSubscription)
    private readonly subscriptionRepo: Repository<UserSubscription>,

    @InjectRepository(BillingTransaction)
    private readonly txnRepo: Repository<BillingTransaction>,

    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,

    private readonly usersService: UsersService,
  ) {}

  // =========================
  // MAIN ENTRY POINT
  // =========================
  async verifyGoogleSubscription(dto: VerifyGoogleSubscriptionDto) {
    if (!dto.userId && !dto.deviceId) {
      throw new BadRequestException('userId or deviceId is required');
    }

    const user = await this.resolveUser(dto.userId, dto.deviceId);

    // 1. VERIFY WITH GOOGLE
    const googleData = await this.verifyWithGoogle(
      dto.purchaseToken,
      dto.productId,
    );

    const orderId = googleData.orderId;
    const startsAt = Number(googleData.startTimeMillis);
    const endsAt = Number(googleData.expiryTimeMillis);
    const autoRenew = googleData.autoRenewing;
    const acknowledged = googleData.acknowledgementState === 1;

    // 2. ACKNOWLEDGE IF REQUIRED
    if (!acknowledged) {
      await this.acknowledgePurchase(dto.purchaseToken, dto.productId);
    }

    // 3. FIND PLAN (MAP productId → plan)
    const plan = await this.planRepo.findOne({
      where: { name: dto.productId },
    });

    if (!plan) {
      throw new BadRequestException('Invalid productId');
    }

    // const subRepo = manager.getRepository(UserSubscription);
    // const txnRepo = manager.getRepository(BillingTransaction);

    // 4. IDEMPOTENCY CHECK (avoid duplicates)
    const existingTxn = await this.txnRepo.findOne({
      where: {
        provider: 'google',
        providerTxnId: orderId,
      },
    });

    if (existingTxn) {
      return {
        message: 'Transaction already processed',
        idempotent: true,
      };
    }

    // 5. FIND OR CREATE SUBSCRIPTION
    let subscription = await this.subscriptionRepo.findOne({
      where: { purchaseToken: dto.purchaseToken },
    });

    if (!subscription) {
      subscription = this.subscriptionRepo.create({
        userId: user.id,
        planId: plan.id,
        provider: 'google',
        purchaseToken: dto.purchaseToken,
      });
    }

    // 6. UPDATE SUBSCRIPTION STATE
    subscription.startsAt = startsAt;
    subscription.endsAt = endsAt;
    subscription.autoRenew = autoRenew;
    subscription.productId = dto.productId;
    subscription.providerStatus = googleData.paymentState?.toString();
    subscription.isAcknowledged = true;
    subscription.status = this.mapGoogleStatus(googleData);

    await this.subscriptionRepo.save(subscription);

    // 7. CREATE BILLING TRANSACTION
    await this.txnRepo.save(
      this.txnRepo.create({
        userId: user.id,
        subscriptionId: subscription.id,
        provider: 'google',
        providerTxnId: orderId,
        purchaseToken: dto.purchaseToken,
        amount: plan.price,
        currency: plan.currency,
        status: BillingTransactionStatus.PAID,
        rawPayload: googleData,
      }),
    );

    return {
      message: 'Subscription verified successfully',
      subscriptionId: subscription.id,
      status: subscription.status,
    };
  }

  // =========================
  // GOOGLE API CALL
  // =========================
  private async verifyWithGoogle(purchaseToken: string, productId: string) {
    const accessToken = await this.getGoogleAccessToken();

    const res = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${process.env.GOOGLE_PACKAGE_NAME}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!res.ok) {
      throw new BadRequestException('Google verification failed');
    }

    return res.json();
  }

  // =========================
  // ACKNOWLEDGE PURCHASE
  // =========================
  private async acknowledgePurchase(purchaseToken: string, productId: string) {
    const accessToken = await this.getGoogleAccessToken();

    await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${process.env.GOOGLE_PACKAGE_NAME}/purchases/subscriptions/${productId}/tokens/${purchaseToken}:acknowledge`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
  }

  // =========================
  // GOOGLE AUTH
  // =========================
  private async getGoogleAccessToken(): Promise<string> {
    const { google } = await import('googleapis');

    const auth = new google.auth.GoogleAuth({
      keyFile:
        process.env.GOOGLE_SERVICE_ACCOUNT_PATH ?? `${__dirname}/account.json`,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();

    return token.token!;
  }

  // =========================
  // STATUS MAPPING
  // =========================
  private mapGoogleStatus(data: any): UserSubscriptionStatus {
    if (data.paymentState === 1) return UserSubscriptionStatus.ACTIVE;
    if (data.paymentState === 0) return UserSubscriptionStatus.PENDING;
    return UserSubscriptionStatus.EXPIRED;
  }

  // =========================
  // USER RESOLUTION
  // =========================
  private async resolveUser(userId?: number, deviceId?: string) {
    if (userId) return this.usersService.findById(userId);

    if (deviceId?.trim()) {
      return this.usersService.findOrCreateGuestByDeviceId(deviceId);
    }

    throw new BadRequestException('userId or deviceId is required');
  }

  async testfilePath() {
    console.log('test path', __dirname);
  }
}
