import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { existsSync } from 'fs';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import {
  RewardEntryType,
  RewardHistory,
} from '../rewards/entities/reward-history.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import {
  UserSubscription,
  UserSubscriptionStatus,
} from './entities/user-subscription.entity';
import {
  BillingTransaction,
  BillingTransactionStatus,
} from './entities/billing-transaction.entity';
import { CoinPack } from './entities/coin-pack.entity';
import {
  BillingCycle,
  SubscriptionPlan,
} from './entities/subscription-plan.entity';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { VerifyGoogleCoinPurchaseDto } from './dto/verify-google-coin-purchase.dto';
import { VerifyGoogleSubscriptionDto } from './dto/verify-subscription.dto';
import * as path from 'path';

type GoogleSubscriptionPurchase = {
  acknowledgementState?: number;
  autoRenewing?: boolean;
  expiryTimeMillis?: string;
  orderId?: string;
  paymentState?: number;
  startTimeMillis?: string;
};

type GoogleProductPurchase = {
  acknowledgementState?: number;
  consumptionState?: number;
  orderId?: string;
  purchaseState?: number;
  purchaseTimeMillis?: string;
};

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(RewardHistory)
    private readonly rewardHistoryRepo: Repository<RewardHistory>,

    @InjectRepository(UserSubscription)
    private readonly subscriptionRepo: Repository<UserSubscription>,

    @InjectRepository(BillingTransaction)
    private readonly txnRepo: Repository<BillingTransaction>,

    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,

    @InjectRepository(CoinPack)
    private readonly coinPackRepo: Repository<CoinPack>,

    private readonly usersService: UsersService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findAllCoinPacks() {
    const coinPacks = await this.coinPackRepo.find({
      order: {
        isActive: 'DESC',
        createdAt: 'DESC',
      },
    });

    return {
      data: coinPacks,
    };
  }

  async createSubscriptionPlan(dto: CreateSubscriptionPlanDto) {
    const normalizedName = dto.name.trim();
    const normalizedCurrency = (dto.currency ?? 'USD').trim().toUpperCase();
    const normalizedGoogleProductId = dto.googleProductId?.trim() || null;

    const existingPlan = await this.planRepo.findOne({
      where: { name: normalizedName, currency: normalizedCurrency },
    });

    if (existingPlan) {
      throw new BadRequestException(
        'A plan with this name and currency already exists',
      );
    }

    try {
      const plan = await this.planRepo.save(
        this.planRepo.create({
          name: normalizedName,
          description: dto.description?.trim() || null,
          price: dto.price,
          currency: normalizedCurrency,
          durationDays: dto.durationDays,
          billingCycle: dto.billingCycle ?? BillingCycle.MONTHLY,
          isActive: dto.isActive ?? true,
          googleProductId: normalizedGoogleProductId,
        }),
      );

      return {
        message: 'Subscription plan created successfully',
        plan,
      };
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        this.isUniqueConstraintViolation(error)
      ) {
        throw new BadRequestException(
          'googleProductId is already assigned to another plan',
        );
      }

      throw error;
    }
  }

  async verifyGoogleCoinPurchase(dto: VerifyGoogleCoinPurchaseDto) {
    if (!dto.userId && !dto.deviceId) {
      throw new BadRequestException('userId or deviceId is required');
    }

    const user = await this.resolveUser(dto.userId, dto.deviceId);
    const coinPack = await this.coinPackRepo.findOne({
      where: { googleProductId: dto.productId, isActive: true },
    });

    if (!coinPack) {
      throw new BadRequestException('Invalid or inactive coin pack productId');
    }

    const coinsToCredit = coinPack.coins + (coinPack.bonusCoins ?? 0);
    if (coinsToCredit <= 0) {
      throw new BadRequestException('Coin pack must credit at least 1 coin');
    }

    const googleData = await this.verifyGoogleProductPurchase(
      dto.purchaseToken,
      dto.productId,
    );

    const purchaseState = Number(googleData.purchaseState);
    if (purchaseState === 1) {
      throw new BadRequestException('Google coin purchase is cancelled');
    }
    if (purchaseState === 2) {
      throw new BadRequestException('Google coin purchase is pending');
    }
    if (purchaseState !== 0) {
      throw new BadRequestException('Google coin purchase is not completed');
    }

    const orderId = googleData.orderId?.trim();
    if (!orderId) {
      throw new BadRequestException('Google response missing orderId');
    }

    const idempotencyKey = `google_coin_purchase:${orderId}`;

    const existingTxn = await this.txnRepo.findOne({
      where: {
        provider: 'google_coin',
        providerTxnId: orderId,
      },
    });

    if (existingTxn) {
      return {
        message: 'Coin purchase already processed',
        idempotent: true,
      };
    }

    const existingHistory = await this.rewardHistoryRepo.findOne({
      where: { idempotencyKey },
    });

    if (existingHistory) {
      const latestUser = await this.userRepo.findOne({
        where: { id: user.id },
      });

      return {
        message: 'Coin purchase already processed',
        idempotent: true,
        coinsGranted: existingHistory.coinsDelta,
        balance: latestUser?.balance ?? user.balance,
        orderId,
      };
    }

    if (googleData.acknowledgementState !== 1) {
      await this.acknowledgeProductPurchase(dto.purchaseToken, dto.productId);
    }

    if (googleData.consumptionState !== 1) {
      await this.consumeProductPurchase(dto.purchaseToken, dto.productId);
    }

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const managerUserRepo = manager.getRepository(User);
        const managerHistoryRepo = manager.getRepository(RewardHistory);
        const managerTxnRepo = manager.getRepository(BillingTransaction);

        const txnInTransaction = await managerTxnRepo.findOne({
          where: {
            provider: 'google_coin',
            providerTxnId: orderId,
          },
        });

        if (txnInTransaction) {
          const latestUser = await managerUserRepo.findOne({
            where: { id: user.id },
          });
          return {
            alreadyProcessed: true,
            balance: latestUser?.balance ?? user.balance,
          };
        }

        const historyInTransaction = await managerHistoryRepo.findOne({
          where: { idempotencyKey },
        });

        if (historyInTransaction) {
          const latestUser = await managerUserRepo.findOne({
            where: { id: user.id },
          });
          return {
            alreadyProcessed: true,
            balance: latestUser?.balance ?? user.balance,
          };
        }

        const userRecord = await managerUserRepo.findOne({
          where: { id: user.id },
        });
        if (!userRecord) {
          throw new BadRequestException(`User ${user.id} not found`);
        }

        userRecord.balance += coinsToCredit;
        await managerUserRepo.save(userRecord);

        await managerHistoryRepo.save(
          managerHistoryRepo.create({
            userId: user.id,
            ruleId: null,
            entryType: RewardEntryType.REWARD,
            coinsDelta: coinsToCredit,
            referenceType: 'google_coin_purchase',
            referenceId: orderId,
            idempotencyKey,
          }),
        );

        await managerTxnRepo.save(
          managerTxnRepo.create({
            userId: user.id,
            subscriptionId: null,
            provider: 'google_coin',
            providerTxnId: orderId,
            purchaseToken: dto.purchaseToken,
            amount: coinPack.price,
            currency: coinPack.currency,
            status: BillingTransactionStatus.PAID,
            rawPayload: {
              googlePurchase: googleData,
              coinPack: {
                id: coinPack.id,
                googleProductId: coinPack.googleProductId,
                coins: coinPack.coins,
                bonusCoins: coinPack.bonusCoins ?? 0,
                price: coinPack.price,
                currency: coinPack.currency,
              },
            },
          }),
        );

        return {
          alreadyProcessed: false,
          balance: userRecord.balance,
        };
      });

      if (result.alreadyProcessed) {
        return {
          message: 'Coin purchase already processed',
          idempotent: true,
          coinsGranted: coinsToCredit,
          balance: result.balance,
          orderId,
        };
      }

      return {
        message: 'Coin purchase verified and credited successfully',
        idempotent: false,
        coinsGranted: coinsToCredit,
        balance: result.balance,
        orderId,
      };
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        this.isUniqueConstraintViolation(error)
      ) {
        const latestUser = await this.userRepo.findOne({
          where: { id: user.id },
        });
        return {
          message: 'Coin purchase already processed',
          idempotent: true,
          coinsGranted: coinsToCredit,
          balance: latestUser?.balance ?? user.balance,
          orderId,
        };
      }

      throw error;
    }
  }

  async verifyGoogleSubscription(dto: VerifyGoogleSubscriptionDto) {
    if (!dto.userId && !dto.deviceId) {
      throw new BadRequestException('userId or deviceId is required');
    }

    const user = await this.resolveUser(dto.userId, dto.deviceId);

    const googleData = await this.verifyWithGoogle(
      dto.purchaseToken,
      dto.productId,
    );

    const orderId = googleData.orderId?.trim();
    if (!orderId) {
      throw new BadRequestException('Google response missing orderId');
    }
    const startsAt = Number(googleData.startTimeMillis);
    const endsAt = Number(googleData.expiryTimeMillis);
    const autoRenew = googleData.autoRenewing ?? false;
    const isAlreadyAcknowledged = googleData.acknowledgementState === 1;

    if (!isAlreadyAcknowledged) {
      await this.acknowledgePurchase(dto.purchaseToken, dto.productId);
    }

    const plan = await this.findPlanForProduct(dto.productId);
    if (!plan) {
      throw new BadRequestException('Invalid productId');
    }

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

    subscription.startsAt = startsAt;
    subscription.endsAt = endsAt;
    subscription.autoRenew = autoRenew;
    subscription.productId = dto.productId;
    subscription.providerStatus = googleData.paymentState?.toString() ?? '';
    subscription.isAcknowledged = true;
    subscription.status = this.mapGoogleStatus(googleData);

    await this.subscriptionRepo.save(subscription);

    try {
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
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        this.isUniqueConstraintViolation(error)
      ) {
        return {
          message: 'Transaction already processed',
          idempotent: true,
        };
      }

      throw error;
    }

    return {
      message: 'Subscription verified successfully',
      subscriptionId: subscription.id,
      status: subscription.status,
    };
  }

  private async verifyWithGoogle(
    purchaseToken: string,
    productId: string,
  ): Promise<GoogleSubscriptionPurchase> {
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
      const responseBody = await this.readResponseBody(res);
      throw new BadRequestException(
        `Google verification failed: ${res.status} ${responseBody}`,
      );
    }

    return (await res.json()) as GoogleSubscriptionPurchase;
  }

  private async acknowledgePurchase(purchaseToken: string, productId: string) {
    const accessToken = await this.getGoogleAccessToken();

    const res = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${process.env.GOOGLE_PACKAGE_NAME}/purchases/subscriptions/${productId}/tokens/${purchaseToken}:acknowledge`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!res.ok) {
      const responseBody = await this.readResponseBody(res);
      throw new BadRequestException(
        `Google acknowledge failed: ${res.status} ${responseBody}`,
      );
    }
  }

  private async verifyGoogleProductPurchase(
    purchaseToken: string,
    productId: string,
  ): Promise<GoogleProductPurchase> {
    const accessToken = await this.getGoogleAccessToken();
    const res = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${process.env.GOOGLE_PACKAGE_NAME}/purchases/products/${productId}/tokens/${purchaseToken}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!res.ok) {
      const responseBody = await this.readResponseBody(res);
      throw new BadRequestException(
        `Google product verification failed: ${res.status} ${responseBody}`,
      );
    }

    return (await res.json()) as GoogleProductPurchase;
  }

  private async acknowledgeProductPurchase(
    purchaseToken: string,
    productId: string,
  ) {
    const accessToken = await this.getGoogleAccessToken();

    const res = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${process.env.GOOGLE_PACKAGE_NAME}/purchases/products/${productId}/tokens/${purchaseToken}:acknowledge`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      },
    );

    if (!res.ok) {
      const responseBody = await this.readResponseBody(res);
      throw new BadRequestException(
        `Google product acknowledge failed: ${res.status} ${responseBody}`,
      );
    }
  }

  private async consumeProductPurchase(
    purchaseToken: string,
    productId: string,
  ) {
    const accessToken = await this.getGoogleAccessToken();

    const res = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${process.env.GOOGLE_PACKAGE_NAME}/purchases/products/${productId}/tokens/${purchaseToken}:consume`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!res.ok) {
      const responseBody = await this.readResponseBody(res);
      throw new BadRequestException(
        `Google product consume failed: ${res.status} ${responseBody}`,
      );
    }
  }

  private async getGoogleAccessToken(): Promise<string> {
    const { google } = await import('googleapis');
    const keyFile = this.resolveGoogleServiceAccountPath();

    const auth = new google.auth.GoogleAuth({
      keyFile,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();

    return token.token!;
  }

  private resolveGoogleServiceAccountPath(): string {
    const fromEnv = process.env.GOOGLE_SERVICE_ACCOUNT_PATH?.trim();
    if (fromEnv) {
      return fromEnv;
    }

    const candidates = [
      path.resolve(process.cwd(), 'service', 'dramafy.json'),
      path.resolve(
        process.cwd(),
        'src',
        'subscriptions',
        'service',
        'dramafy.json',
      ),
      path.resolve(__dirname, 'service', 'dramafy.json'),
      path.resolve(__dirname, '..', '..', '..', 'service', 'dramafy.json'),
    ];

    const existing = candidates.find((candidate) => existsSync(candidate));
    if (existing) {
      return existing;
    }

    throw new BadRequestException(
      'Google service account key file not found. Set GOOGLE_SERVICE_ACCOUNT_PATH or place dramafy.json in /service',
    );
  }

  private mapGoogleStatus(data: any): UserSubscriptionStatus {
    const now = Date.now();
    const expiryTime = Number(data.expiryTimeMillis);

    if (Number.isFinite(expiryTime) && expiryTime <= now) {
      return UserSubscriptionStatus.EXPIRED;
    }

    if (data.paymentState === 0 || data.paymentState === 3) {
      return UserSubscriptionStatus.PENDING;
    }

    if (data.paymentState === 1 || data.paymentState === 2) {
      return UserSubscriptionStatus.ACTIVE;
    }

    if (Number.isFinite(expiryTime) && expiryTime > now) {
      return UserSubscriptionStatus.ACTIVE;
    }

    return UserSubscriptionStatus.EXPIRED;
  }

  private async resolveUser(userId?: number, deviceId?: string) {
    if (userId) return this.usersService.findById(userId);

    if (deviceId?.trim()) {
      return this.usersService.findOrCreateGuestByDeviceId(deviceId);
    }

    throw new BadRequestException('userId or deviceId is required');
  }

  private async findPlanForProduct(
    productId: string,
  ): Promise<SubscriptionPlan | null> {
    const activeMappedPlan = await this.planRepo.findOne({
      where: {
        googleProductId: productId,
        isActive: true,
      },
    });

    if (activeMappedPlan) {
      return activeMappedPlan;
    }

    const activeNameMatchPlan = await this.planRepo.findOne({
      where: {
        name: productId,
        isActive: true,
      },
    });

    if (activeNameMatchPlan) {
      return activeNameMatchPlan;
    }

    const mappedPlan = await this.planRepo.findOne({
      where: {
        googleProductId: productId,
      },
    });

    if (mappedPlan) {
      return mappedPlan;
    }

    return this.planRepo.findOne({
      where: {
        name: productId,
      },
    });
  }

  private async readResponseBody(response: Response): Promise<string> {
    try {
      const payload = await response.json();
      return JSON.stringify(payload);
    } catch {
      return await response.text();
    }
  }

  private isUniqueConstraintViolation(error: QueryFailedError): boolean {
    const driverError = error.driverError as { code?: string } | undefined;
    return driverError?.code === '23505';
  }
}
