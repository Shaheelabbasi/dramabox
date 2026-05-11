import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { existsSync, readFileSync } from 'fs';
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
import { SubscriptionStatus } from './enums/subscriptions.enum';

type GoogleSubscriptionPurchase = {
  acknowledgementState?: number;
  autoRenewing?: boolean;
  expiryTimeMillis?: string;
  orderId?: string;
  paymentState?: number;
  startTimeMillis?: string;
};

type GoogleSubscriptionPurchaseV2 = {
  acknowledgementState?: string;
  latestOrderId?: string;
  startTime?: string;
  subscriptionState?: string;
  lineItems?: Array<{
    productId?: string;
    expiryTime?: string;
    autoRenewingPlan?: {
      autoRenewEnabled?: boolean;
    };
    offerDetails?: {
      basePlanId?: string;
      offerId?: string;
    };
  }>;
};

type GoogleProductPurchase = {
  acknowledgementState?: number;
  consumptionState?: number;
  orderId?: string;
  purchaseState?: number;
  purchaseTimeMillis?: string;
};

type NormalizedGoogleSubscriptionPurchase = {
  orderId: string;
  startsAt: number;
  endsAt: number;
  autoRenew: boolean;
  isAcknowledged: boolean;
  providerStatus: string;
  productId: string;
  status: UserSubscriptionStatus;
  rawPayload: Record<string, unknown>;
};

type GoogleServiceAccountCredentials = {
  client_email: string;
  private_key: string;
  private_key_id?: string;
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

  async findAllPlans() {
    const plans = await this.planRepo.find({
      relations: {
        basePlans: {
          offers: true,
        },
      },
      order: {
        isActive: 'DESC',
        createdAt: 'DESC',
        basePlans: {
          createdAt: 'ASC',
          offers: {
            createdAt: 'ASC',
          },
        },
      },
    });

    return {
      data: plans,
    };
  }

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

  async  verifyGoogleCoinPurchase(dto: VerifyGoogleCoinPurchaseDto) {
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
    const normalizedPurchase = await this.verifyGoogleSubscriptionPurchase(dto);

    if (!normalizedPurchase.isAcknowledged) {
      await this.acknowledgePurchase(
        dto.purchaseToken,
        normalizedPurchase.productId,
      );
    }

    const plan = await this.findPlanForProduct(normalizedPurchase.productId);
    if (!plan) {
      throw new BadRequestException(
        `Invalid productId: ${normalizedPurchase.productId}`,
      );
    }

    const existingTxn = await this.txnRepo.findOne({
      where: {
        provider: 'google',
        providerTxnId: normalizedPurchase.orderId,
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

    subscription.startsAt = normalizedPurchase.startsAt;
    subscription.endsAt = normalizedPurchase.endsAt;
    subscription.autoRenew = normalizedPurchase.autoRenew;
    subscription.productId = normalizedPurchase.productId;
    subscription.providerStatus = normalizedPurchase.providerStatus;
    subscription.isAcknowledged = true;
    subscription.status = normalizedPurchase.status;

    await this.subscriptionRepo.save(subscription);

    try {
      await this.txnRepo.save(
        this.txnRepo.create({
          userId: user.id,
          subscriptionId: subscription.id,
          provider: 'google',
          providerTxnId: normalizedPurchase.orderId,
          purchaseToken: dto.purchaseToken,
          amount: plan.price,
          currency: plan.currency,
          status: BillingTransactionStatus.PAID,
          rawPayload: normalizedPurchase.rawPayload,
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

  private async verifyGoogleSubscriptionPurchase(
    dto: VerifyGoogleSubscriptionDto,
  ): Promise<NormalizedGoogleSubscriptionPurchase> {
    try {
      const googleV2Data = await this.verifyWithGoogleV2(dto.purchaseToken);
      const normalizedFromV2 = this.normalizeGoogleV2Purchase(
        googleV2Data,
        dto.productId,
        dto.purchaseToken,
      );
      if (normalizedFromV2) {
        return normalizedFromV2;
      }
    } catch (error) {
      if (
        !(error instanceof BadRequestException) ||
        !error.message.includes('Google verification failed')
      ) {
        //throw error;
      }
    }

    const googleData = await this.verifyWithGoogle(
      dto.purchaseToken,
      dto.productId,
    );
    return this.normalizeGoogleV1Purchase(
      googleData,
      dto.productId,
      dto.purchaseToken,
    );
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

  private async verifyWithGoogleV2(
    purchaseToken: string,
  ): Promise<GoogleSubscriptionPurchaseV2> {
    const accessToken = await this.getGoogleAccessToken();

    if (!accessToken) {
      throw new BadRequestException('toekn not found ');
    }

    const res = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${process.env.GOOGLE_PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${purchaseToken}`,
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

    return (await res.json()) as GoogleSubscriptionPurchaseV2;
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
    const credentials = this.loadGoogleServiceAccountCredentials();

    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    try {
      const tokenResponse = await auth.getAccessToken();
      const accessToken =
        typeof tokenResponse === 'string'
          ? tokenResponse
          : tokenResponse?.token;

      if (!accessToken) {
        throw new BadRequestException(
          'Unable to acquire Google access token from service account credentials.',
        );
      }

      return accessToken;
    } catch (error: any) {
      const errorText = String(error?.message ?? '');
      if (
        errorText.includes('invalid_grant') &&
        errorText.includes('Invalid JWT Signature')
      ) {
        throw new BadRequestException(
          `Google service account authentication failed (invalid JWT signature). Verify GOOGLE service-account key is valid/not revoked for ${credentials.client_email} and regenerate key if needed.`,
        );
      }

      throw error;
    }
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

  private loadGoogleServiceAccountCredentials(): GoogleServiceAccountCredentials {
    const keyFile = this.resolveGoogleServiceAccountPath();
    let parsed: Partial<GoogleServiceAccountCredentials>;

    try {
      const raw = readFileSync(keyFile, 'utf8');
      parsed = JSON.parse(raw) as Partial<GoogleServiceAccountCredentials>;
    } catch (error) {
      throw new BadRequestException(
        `Failed to read/parse Google service account key file: ${keyFile}`,
      );
    }

    const clientEmail = parsed.client_email?.trim();
    const privateKey = parsed.private_key
      ?.replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .trim();

    if (!clientEmail || !privateKey) {
      throw new BadRequestException(
        `Google service account key file is missing client_email or private_key: ${keyFile}`,
      );
    }

    if (
      !privateKey.includes('-----BEGIN PRIVATE KEY-----') ||
      !privateKey.includes('-----END PRIVATE KEY-----')
    ) {
      throw new BadRequestException(
        `Google service account private_key format is invalid: ${keyFile}`,
      );
    }

    return {
      client_email: clientEmail,
      private_key: privateKey,
      private_key_id: parsed.private_key_id?.trim(),
    };
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

  private normalizeGoogleV1Purchase(
    data: GoogleSubscriptionPurchase,
    fallbackProductId: string,
    purchaseToken: string,
  ): NormalizedGoogleSubscriptionPurchase {
    const startsAt = Number(data.startTimeMillis);
    const endsAt = Number(data.expiryTimeMillis);
    const safeStartsAt = Number.isFinite(startsAt) ? startsAt : Date.now();
    const safeEndsAt =
      Number.isFinite(endsAt) && endsAt > safeStartsAt
        ? endsAt
        : safeStartsAt + 1000;

    return {
      orderId: this.normalizeProviderTxnId(data.orderId, purchaseToken),
      startsAt: safeStartsAt,
      endsAt: safeEndsAt,
      autoRenew: data.autoRenewing ?? false,
      isAcknowledged: data.acknowledgementState === 1,
      providerStatus: data.paymentState?.toString() ?? '',
      productId: fallbackProductId,
      status: this.mapGoogleStatus(data),
      rawPayload: {
        source: 'subscriptions_v1',
        productId: fallbackProductId,
        ...data,
      },
    };
  }

  private normalizeGoogleV2Purchase(
    data: GoogleSubscriptionPurchaseV2,
    fallbackProductId: string,
    purchaseToken: string,
  ): NormalizedGoogleSubscriptionPurchase | null {
    const lineItems = data.lineItems ?? [];
    if (lineItems.length === 0) {
      return null;
    }

    const sortedLineItems = [...lineItems].sort((a, b) => {
      const aExpiry = Date.parse(a.expiryTime ?? '');
      const bExpiry = Date.parse(b.expiryTime ?? '');
      return bExpiry - aExpiry;
    });
    const activeLineItem = sortedLineItems[0];
    const startsAt = Date.parse(data.startTime ?? '');
    const endsAt = Date.parse(activeLineItem.expiryTime ?? '');
    const safeStartsAt = Number.isFinite(startsAt) ? startsAt : Date.now();
    const safeEndsAt =
      Number.isFinite(endsAt) && endsAt > safeStartsAt
        ? endsAt
        : safeStartsAt + 1000;
    const resolvedProductId = activeLineItem.productId || fallbackProductId;

    return {
      orderId: this.normalizeProviderTxnId(data.latestOrderId, purchaseToken),
      startsAt: safeStartsAt,
      endsAt: safeEndsAt,
      autoRenew: activeLineItem.autoRenewingPlan?.autoRenewEnabled ?? false,
      isAcknowledged:
        data.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
      providerStatus: data.subscriptionState ?? '',
      productId: resolvedProductId,
      status: this.mapGoogleV2Status(data.subscriptionState, safeEndsAt),
      rawPayload: {
        source: 'subscriptions_v2',
        productId: resolvedProductId,
        basePlanId: activeLineItem.offerDetails?.basePlanId ?? null,
        offerId: activeLineItem.offerDetails?.offerId ?? null,
        ...data,
      },
    };
  }

  private mapGoogleV2Status(
    subscriptionState: string | undefined,
    expiryTimeMillis: number,
  ): UserSubscriptionStatus {
    if (subscriptionState === 'SUBSCRIPTION_STATE_CANCELED') {
      return UserSubscriptionStatus.CANCELLED;
    }

    if (subscriptionState === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD') {
      return UserSubscriptionStatus.GRACE_PERIOD;
    }

    if (subscriptionState === 'SUBSCRIPTION_STATE_PENDING') {
      return UserSubscriptionStatus.PENDING;
    }

    if (
      subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE' ||
      subscriptionState === 'SUBSCRIPTION_STATE_ON_HOLD'
    ) {
      return UserSubscriptionStatus.ACTIVE;
    }

    if (Number.isFinite(expiryTimeMillis) && expiryTimeMillis > Date.now()) {
      return UserSubscriptionStatus.ACTIVE;
    }

    return UserSubscriptionStatus.EXPIRED;
  }

  private normalizeProviderTxnId(
    orderId: string | undefined,
    purchaseToken: string,
  ): string {
    const resolved =
      orderId?.trim() || `google_purchase_token:${purchaseToken}`;
    return resolved.slice(0, 150);
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

  async handleGoogleRtdn(body: any): Promise<void> {
    // Pub/Sub wraps the payload in a message envelope
    const messageData = body?.message?.data;
    if (!messageData) {
      console.warn('RTDN: missing message.data', body);
      return;
    }

    // Decode base64 payload
    let payload: any;
    try {
      const json = Buffer.from(messageData, 'base64').toString('utf-8');
      payload = JSON.parse(json);
    } catch {
      console.warn('RTDN: failed to decode message.data');
      return;
    }

    // Play sends a testNotification on setup — just acknowledge it
    if (payload.testNotification) {
      console.log('RTDN: test notification received ✅');
      return;
    }

    const notification = payload.subscriptionNotification;
    if (!notification) {
      console.warn('RTDN: no subscriptionNotification in payload', payload);
      return;
    }

    const { notificationType, purchaseToken, subscriptionId } = notification;
    console.log(`RTDN: type=${notificationType} sku=${subscriptionId}`);

    // Find subscription record by purchaseToken
    const subscription = await this.subscriptionRepo.findOne({
      where: { purchaseToken },
    });

    if (!subscription) {
      console.warn(
        `RTDN: no subscription found for purchaseToken=${purchaseToken}`,
      );
      return;
    }
    switch (notificationType) {
      case SubscriptionStatus.SUBSCRIPTION_RENEWED:
      case SubscriptionStatus.SUBSCRIPTION_RESTARTED: {
        // Fetch fresh expiry from Play API
        const freshData = await this.verifyWithGoogleV2(purchaseToken);
        const normalized = this.normalizeGoogleV2Purchase(
          freshData,
          subscriptionId,
          purchaseToken,
        );
        if (normalized) {
          await this.subscriptionRepo.update(subscription.id, {
            status: normalized.status,
            endsAt: normalized.endsAt,
            autoRenew: normalized.autoRenew,
            providerStatus: normalized.providerStatus,
          });
          console.log(
            `RTDN: renewed userId=${subscription.userId} endsAt=${new Date(normalized.endsAt).toISOString()}`,
          );
        }
        break;
      }

      case SubscriptionStatus.SUBSCRIPTION_CANCELED: {
        // User canceled — keep access until current period ends
        await this.subscriptionRepo.update(subscription.id, {
          status: UserSubscriptionStatus.CANCELLED,
          autoRenew: false,
        });
        console.log(
          `RTDN: canceled userId=${subscription.userId} access until endsAt`,
        );
        break;
      }

      case SubscriptionStatus.SUBSCRIPTION_EXPIRED:
      case SubscriptionStatus.SUBSCRIPTION_REVOKED: {
        await this.subscriptionRepo.update(subscription.id, {
          status: UserSubscriptionStatus.EXPIRED,
        });
        console.log(`RTDN: expired userId=${subscription.userId}`);
        break;
      }

      case SubscriptionStatus.SUBSCRIPTION_ON_HOLD: {
        // Payment failed — revoke access
        await this.subscriptionRepo.update(subscription.id, {
          status: UserSubscriptionStatus.EXPIRED,
          autoRenew: false,
        });
        console.log(
          `RTDN: on_hold (payment failed) userId=${subscription.userId}`,
        );
        break;
      }

      case SubscriptionStatus.SUBSCRIPTION_IN_GRACE_PERIOD: {
        // Payment failed but grace period active — keep access, mark grace period
        await this.subscriptionRepo.update(subscription.id, {
          status: UserSubscriptionStatus.GRACE_PERIOD,
        });
        console.log(`RTDN: grace_period userId=${subscription.userId}`);
        break;
      }

      default:
        console.log(`RTDN: unhandled notificationType=${notificationType}`);
    }
  }
}
