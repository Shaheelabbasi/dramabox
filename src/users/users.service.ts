import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Between, In, LessThanOrEqual, MoreThan, Not, Repository } from 'typeorm';
import { PageDto } from '../../config/common/dto/page.dto';
import { PageMetaDto } from '../../config/common/dto/page-meta.dto';
import { Drama } from '../dramas/entities/drama.entity';
import { WatchHistory } from '../dramas/entities/watch-history.entity';
import { NotificationService } from '../notifications/notification.service';
import { Notifications } from '../notifications/entities/notification.entity';
import { NotificationTrigger } from '../notifications/enums/notification-trigger.enum';
import { RewardHistory } from '../rewards/entities/reward-history.entity';
import { RewardsService } from '../rewards/rewards.service';
import { BillingTransaction } from '../subscriptions/entities/billing-transaction.entity';
import {
  UserSubscription,
  UserSubscriptionStatus,
} from '../subscriptions/entities/user-subscription.entity';
import { NotifyUserDto } from './dto/notify-user.dto';
import { ListAllUsersDto } from './dto/list-all-users.dto';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto';
import { UserCheckIn } from './entities/user-check-in.entity';
import { User } from './entities/user.entity';
import { UpdateFirebaseTokenDto } from './dto/update-firebase-token.dto';
import { ListUserWatchHistoryDto } from './dto/list-user-watch-history.dto';
import { UpdateUserDetailsDto } from './dto/update-user-details.dto';
import { CheckInDto } from './dto/check-in.dto';
import { AccountStatus } from './enums/account-status.enum';
import { UserStreak } from './entities/user-streaks.entity';

type CreateUserInput = {
  email: string;
  password: string;
  deviceId?: string;
  role?: string;
};
const DAILY_CHECK_IN_RULE_CODE = 'daily_login';
const DAILY_CHECK_IN_REFERENCE_TYPE = 'daily_check_in';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

// constants file
export const STREAK_MILESTONES = [7, 14, 30, 60, 100, 365];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserSubscription)
    private readonly userSubscriptionsRepository: Repository<UserSubscription>,
    @InjectRepository(BillingTransaction)
    private readonly billingTransactionsRepository: Repository<BillingTransaction>,
    @InjectRepository(RewardHistory)
    private readonly rewardHistoryRepository: Repository<RewardHistory>,
    @InjectRepository(WatchHistory)
    private readonly watchHistoryRepository: Repository<WatchHistory>,
    @InjectRepository(Notifications)
    private readonly notificationsRepository: Repository<Notifications>,
    @InjectRepository(UserCheckIn)
    private readonly userCheckInRepository: Repository<UserCheckIn>,

    @InjectRepository(UserStreak)
    private readonly userStreakRepository: Repository<UserStreak>,
    @InjectRepository(Drama)
    //private readonly dramaRepository: Repository<Drama>,
    private readonly notificationService: NotificationService,
    private readonly rewardsService: RewardsService,
  ) {}

  async createUser({
    email,
    password,
    deviceId,
    role,
  }: CreateUserInput): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await this.usersRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new BadRequestException('Email is already registered');
    }

    const user = this.usersRepository.create({
      email: normalizedEmail,
      password,
      deviceId: deviceId?.trim() || null,
      role: role?.trim() || 'user',
      accountStatus: AccountStatus.ACTIVE,
    });

    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.trim().toLowerCase() },
    });
  }

  async findByDeviceId(deviceId: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { deviceId: deviceId.trim() },
    });
  }

  async findOrCreateGuestByDeviceId(deviceId: string): Promise<User> {
    const normalizedDeviceId = deviceId.trim();

    if (!normalizedDeviceId) {
      throw new BadRequestException('deviceId is required');
    }

    const existingUser = await this.findByDeviceId(normalizedDeviceId);

    if (existingUser) {
      return existingUser;
    }

    const safeDeviceSlug = normalizedDeviceId
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

    const fallbackSlug = safeDeviceSlug || 'guest';
    const guestEmail = `${fallbackSlug}-${randomUUID()}@guest.dramabox.local`;

    return this.createUser({
      email: guestEmail,
      password: randomUUID(),
      deviceId: normalizedDeviceId,
      role: 'guest',
    });
  }

  async findById(userId: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return user;
  }

  async updateAccountStatus(
    userId: number,
    updateAccountStatusDto: UpdateAccountStatusDto,
  ) {
    const user = await this.findById(userId);

    if (user.role === 'admin') {
      throw new BadRequestException('Admin users cannot be blocked');
    }

    user.accountStatus = updateAccountStatusDto.accountStatus;
    const savedUser = await this.usersRepository.save(user);

    return {
      message: 'Account status updated successfully',
      user: {
        id: savedUser.id,
        email: savedUser.email,
        device_id: savedUser.deviceId,
        role: savedUser.role,
        account_status: savedUser.accountStatus,
        updated_at: savedUser.updatedAt,
      },
    };
  }

  async checkIn(checkInDto: CheckInDto) {
    const user = await this.resolveUserFromIdentifiers(checkInDto);
    const userId = user.id;
    const now = new Date();
    const { startOfDayMs, endOfDayMs, nextDayStartMs, dayKey } =
      this.getUtcDayWindow(now);
    const todayDayStart = this.getUtcDayStartMs(now.getTime());

    const [existingCheckIn, dailyRule, streakRecord] = await Promise.all([
      this.userCheckInRepository.findOne({
        where: { userId, checkInAt: Between(startOfDayMs, endOfDayMs) },
        order: { id: 'DESC' },
      }),
      this.rewardsService.findRuleByCode(DAILY_CHECK_IN_RULE_CODE),
      this.userStreakRepository.findOne({ where: { userId } }),
    ]);

    const todayReward =
      dailyRule && dailyRule.isActive ? Number(dailyRule.coins) : 0;

    if (existingCheckIn) {
      return {
        message: 'User already checked in today',
        checked_in: true,
        already_checked_in: true,
        check_in_at: Number(existingCheckIn.checkInAt),
        can_claim: false,
        today_reward: todayReward,
        next_claim_at: nextDayStartMs,
      };
    }

    const rawStreak =
      streakRecord ??
      this.userStreakRepository.create({
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastCheckInDay: null,
      });

    const { streak } = this.calculateStreak(rawStreak, todayDayStart);

    const [rewardResult, checkIn] = await Promise.all([
      this.rewardsService.applyReward({
        userId,
        ruleCode: DAILY_CHECK_IN_RULE_CODE,
        referenceType: DAILY_CHECK_IN_REFERENCE_TYPE,
        referenceId: `${userId}:${dayKey}`,
        idempotencyKey: `${DAILY_CHECK_IN_REFERENCE_TYPE}:${userId}:${dayKey}`,
      }),
      this.userCheckInRepository.save(
        this.userCheckInRepository.create({
          userId,
          checkInAt: now.getTime(),
        }),
      ),
      this.userStreakRepository.save(streak),
    ]);

    return {
      message: 'Check-in recorded successfully',
      checked_in: true,
      already_checked_in: false,
      check_in_at: Number(checkIn.checkInAt),
      can_claim: false,
      today_reward: todayReward,
      next_claim_at: nextDayStartMs,
      reward: {
        status: rewardResult.status,
        coins_delta: rewardResult.coins_delta,
        balance: rewardResult.balance,
      },
    };
  }

  private getUtcDayStartMs(timestampMs: number): number {
    const date = new Date(timestampMs);
    date.setUTCHours(0, 0, 0, 0);
    return date.getTime();
  }
  private calculateStreak(
    streak: UserStreak,
    todayDayStart: number,
  ): { streak: UserStreak; streakBroken: boolean } {
    const lastDay = streak.lastCheckInDay
      ? Number(streak.lastCheckInDay)
      : null;

    const gapDays =
      lastDay !== null
        ? Math.floor((todayDayStart - lastDay) / MILLISECONDS_PER_DAY)
        : null;

    const streakBroken = gapDays !== null && gapDays > 1;
    streak.currentStreak = gapDays === 1 ? streak.currentStreak + 1 : 1;
    streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
    streak.lastCheckInDay = todayDayStart;

    return { streak, streakBroken };
  }

  async getUserStreak(userId: number) {
    const streakRecord = await this.userStreakRepository.findOne({
      where: { userId },
    });

    if (!streakRecord) {
      return {
        current_streak: 0,
        longest_streak: 0,
        last_check_in_day: null,
        next_milestone: this.getNextMilestone(0),
      };
    }

    return {
      current_streak: streakRecord.currentStreak,
      longest_streak: streakRecord.longestStreak,
      last_check_in_day: streakRecord.lastCheckInDay
        ? Number(streakRecord.lastCheckInDay)
        : null,
      next_milestone: this.getNextMilestone(streakRecord.currentStreak),
    };
  }
  async getCheckInStatus(checkInDto: CheckInDto) {
    const user = await this.resolveUserFromIdentifiers(checkInDto);
    const userId = user.id;
    const now = new Date();
    const { startOfDayMs, endOfDayMs, nextDayStartMs } =
      this.getUtcDayWindow(now);

    const [existingCheckIn, dailyRule] = await Promise.all([
      this.userCheckInRepository.findOne({
        where: {
          userId,
          checkInAt: Between(startOfDayMs, endOfDayMs),
        },
        order: {
          id: 'DESC',
        },
      }),
      this.rewardsService.findRuleByCode(DAILY_CHECK_IN_RULE_CODE),
    ]);

    const todayReward =
      dailyRule && dailyRule.isActive ? Number(dailyRule.coins) : 0;
    const canClaim = !existingCheckIn;

    return {
      canClaim,
      todayReward,
      nextClaimAt: canClaim ? null : nextDayStartMs,
    };
  }

  // service method
  private getNextMilestone(currentStreak: number): number | null {
    return STREAK_MILESTONES.find((m) => m > currentStreak) ?? null;
  }

  async findByIdOrDeviceId(idOrDeviceId: string): Promise<User> {
    const lookupValue = idOrDeviceId.trim();

    if (!lookupValue) {
      throw new BadRequestException('User not found');
    }

    if (/^\d+$/.test(lookupValue)) {
      try {
        return await this.findById(Number(lookupValue));
      } catch (error) {
        if (!(error instanceof NotFoundException)) {
          throw error;
        }
      }
    }

    const user = await this.findByDeviceId(lookupValue);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  async findByIdOrDeviceIdWithSubscriptionFlag(idOrDeviceId: string) {
    const user = await this.findByIdOrDeviceId(idOrDeviceId);
    const now = Date.now();

    const activeSubscriptionCount = await this.userSubscriptionsRepository.count({
      where: {
        userId: user.id,
        status: In([
          UserSubscriptionStatus.ACTIVE,
          UserSubscriptionStatus.GRACE_PERIOD,
        ]),
        startsAt: LessThanOrEqual(now),
        endsAt: MoreThan(now),
      },
    });

    return {
      ...user,
      hasActiveSubscription: activeSubscriptionCount > 0,
    };
  }

  async findUserWatchHistory(
    userIdOrDeviceId: string,
    listUserWatchHistoryDto: ListUserWatchHistoryDto = new ListUserWatchHistoryDto(),
  ) {
    const user = await this.findByIdOrDeviceId(userIdOrDeviceId);

    // 🔹 Subquery: latest watch per drama
    const subQuery = this.watchHistoryRepository
      .createQueryBuilder('wh2')
      .select('MAX(wh2.last_watched_at)', 'max_date')
      .addSelect('wh2.drama_id', 'drama_id')
      .where('wh2.user_id = :userId', { userId: user.id })
      .groupBy('wh2.drama_id');

    const qb = this.watchHistoryRepository
      .createQueryBuilder('wh')
      .innerJoin(
        '(' + subQuery.getQuery() + ')',
        'latest',
        'latest.drama_id = wh.drama_id AND latest.max_date = wh.last_watched_at',
      )
      .innerJoin('wh.drama', 'drama')
      // .leftJoin('drama.dramaGenres', 'dramaGenres')
      // .leftJoin('dramaGenres.genre', 'genre')
      .innerJoin('wh.episode', 'episode')
      .where('wh.user_id = :userId', { userId: user.id })
      .setParameters(subQuery.getParameters())

      .select([
        'drama.id AS drama_id',
        'drama.title AS drama_title',
        'drama.thumbnail_url AS drama_thumbnail',
        'drama.total_episodes AS drama_total_episodes',

        // 'genre.id',
        // 'genre.name',

        'episode.id AS episode_id',
        'episode.title AS episode_title',
        'episode.episode_number AS episode_number',
        'episode.duration_seconds AS duration_seconds',
        'episode.thumbnail AS episode_thumbnail',

        'wh.last_watched_at AS last_watched_at',
        'wh.progress_seconds AS progress_seconds',
        'wh.completed AS completed',
      ])

      .orderBy('wh.drama_id', 'DESC')
      .skip(listUserWatchHistoryDto.skip)
      .take(listUserWatchHistoryDto.take);

    const results = await qb.getRawMany();

    const countResult = await this.watchHistoryRepository
      .createQueryBuilder('wh')
      .select('COUNT(DISTINCT wh.drama_id)', 'count')
      .where('wh.user_id = :userId', { userId: user.id })
      .getRawOne();

    const itemCount = Number(countResult.count);

    const data = results.map((row) => ({
      drama: {
        id: Number(row.drama_id),
        title: row.drama_title,
        thumbnail: row.drama_thumbnail,
        total_episodes: Number(row.drama_total_episodes),
        genre: row.genre_name,
      },
      last_watched_episode: {
        id: Number(row.episode_id),
        title: row.episode_title,
        episode_number: Number(row.episode_number),
        duration_seconds: Number(row.duration_seconds),
        thumbnail: row.episode_thumbnail,
      },
      last_watched_at: row.last_watched_at,
      progress_seconds: Number(row.progress_seconds),
      completed: row.completed,
    }));

    const meta = new PageMetaDto({
      pageOptionsDto: listUserWatchHistoryDto,
      itemCount,
    });

    return new PageDto(data, meta);
  }

  async getAllUsers(pageOptionsDto: ListAllUsersDto = new ListAllUsersDto()) {
    const now = Date.now();
    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .where('user.role != :adminRole', { adminRole: 'admin' })
      .orderBy('user.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    if (pageOptionsDto.search?.trim()) {
      const search = pageOptionsDto.search.trim();
      const normalizedSearch = `%${search.toLowerCase()}%`;

      queryBuilder.andWhere(
        `(
          LOWER(user.email) LIKE :search
          OR LOWER(COALESCE(user.deviceId, '')) LIKE :search
          OR CAST(user.id AS TEXT) LIKE :idSearch
        )`,
        {
          search: normalizedSearch,
          idSearch: `%${search}%`,
        },
      );
    }

    if (pageOptionsDto.hasActiveSubscription !== undefined) {
      const activeSubscriptionSubquery = queryBuilder
        .subQuery()
        .select('1')
        .from(UserSubscription, 'subscription')
        .where('subscription.user_id = user.id')
        .andWhere('subscription.status = :activeStatus')
        .andWhere('subscription.starts_at <= :now')
        .andWhere('subscription.ends_at > :now')
        .getQuery();

      queryBuilder.andWhere(
        pageOptionsDto.hasActiveSubscription
          ? `EXISTS ${activeSubscriptionSubquery}`
          : `NOT EXISTS ${activeSubscriptionSubquery}`,
        {
          activeStatus: UserSubscriptionStatus.ACTIVE,
          now,
        },
      );
    }

    const [users, itemCount] = await queryBuilder.getManyAndCount();
    const userIds = users.map((user) => user.id);
    const latestSubscriptions =
      await this.findLatestSubscriptionsForUsers(userIds);

    const data = users.map((user) =>
      this.toAdminUserListItem(user, latestSubscriptions.get(user.id) ?? null),
    );
    const meta = new PageMetaDto({ pageOptionsDto, itemCount });

    return new PageDto(data, meta);
  }

  async getUserStats() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(startOfToday);
    const dayOfWeek = startOfWeek.getDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);

    const [
      totalUsers,
      registeredUsers,
      guestUsers,
      blockedUsers,
      subscribedUsers,
      newToday,
      newThisWeek,
    ] = await Promise.all([
      this.usersRepository.count({
        where: { role: Not('admin') },
      }),
      this.usersRepository.count({
        where: { role: 'user' },
      }),
      this.usersRepository.count({
        where: { role: 'guest' },
      }),
      this.usersRepository.count({
        where: {
          role: Not('admin'),
          accountStatus: AccountStatus.BLOCKED,
        },
      }),
      this.userSubscriptionsRepository
        .createQueryBuilder('subscription')
        .innerJoin('subscription.user', 'user')
        .where('subscription.status = :status', {
          status: UserSubscriptionStatus.ACTIVE,
        })
        .andWhere('user.role != :adminRole', { adminRole: 'admin' })
        .getCount(),
      this.usersRepository
        .createQueryBuilder('user')
        .where('user.role != :adminRole', { adminRole: 'admin' })
        .andWhere('user.createdAt >= :startOfToday', { startOfToday })
        .getCount(),
      this.usersRepository
        .createQueryBuilder('user')
        .where('user.role != :adminRole', { adminRole: 'admin' })
        .andWhere('user.createdAt >= :startOfWeek', { startOfWeek })
        .getCount(),
    ]);

    return {
      stats: {
        total_users: totalUsers,
        registered_users: registeredUsers,
        guest_users: guestUsers,
        blocked_users: blockedUsers,
        subscribed_users: subscribedUsers,
        new_today: newToday,
        new_this_week: newThisWeek,
      },
    };
  }

  async findAdminUserById(userId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId, role: Not('admin') },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const [
      subscriptions,
      billingTransactions,
      rewardHistory,
      watchHistory,
      notifications,
    ] = await Promise.all([
      this.userSubscriptionsRepository.find({
        where: { userId: user.id },
        relations: { plan: true },
        order: { createdAt: 'DESC' },
        take: 20,
      }),
      this.billingTransactionsRepository.find({
        where: { userId: user.id },
        order: { createdAt: 'DESC' },
        take: 20,
      }),
      this.rewardHistoryRepository.find({
        where: { userId: user.id },
        relations: { rule: true },
        order: { createdAt: 'DESC' },
        take: 20,
      }),
      this.watchHistoryRepository.find({
        where: { user: { id: user.id } },
        relations: {
          episode: {
            drama: true,
          },
          user: true,
        },
        order: { lastWatchedAt: 'DESC' },
        take: 20,
      }),
      this.notificationsRepository.find({
        where: { user: { id: user.id } },
        order: { createdAt: 'DESC' },
        take: 20,
      }),
    ]);

    const latestSubscription = subscriptions[0] ?? null;

    return {
      user: {
        id: user.id,
        email: user.email,
        device_id: user.deviceId,
        role: user.role,
        account_status: user.accountStatus,
        user_type: this.toUserType(user),
        balance: user.balance,
        firebase_token: user.firebaseToken,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      },
      overview: {
        app_id: user.id,
        email: user.email,
        device_id: user.deviceId,
        user_type: this.toUserType(user),
        account_status: user.accountStatus,
        wallet_balance: user.balance,
        has_firebase_token: Boolean(user.firebaseToken),
        registered_at: user.createdAt,
        current_subscription: latestSubscription
          ? this.toSubscriptionSummary(latestSubscription)
          : null,
      },
      subscription: {
        current: latestSubscription
          ? this.toSubscriptionSummary(latestSubscription)
          : null,
        history: subscriptions.map((subscription) =>
          this.toSubscriptionSummary(subscription),
        ),
      },
      wallet: {
        balance: user.balance,
        reward_transactions: rewardHistory.map((entry) => ({
          id: entry.id,
          entry_type: entry.entryType,
          coins_delta: entry.coinsDelta,
          reference_type: entry.referenceType,
          reference_id: entry.referenceId,
          rule_name: entry.rule?.name ?? null,
          created_at: entry.createdAt,
        })),
        billing_transactions: billingTransactions.map((transaction) => ({
          id: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency,
          provider: transaction.provider,
          provider_txn_id: transaction.providerTxnId,
          status: transaction.status,
          created_at: transaction.createdAt,
        })),
      },
      watch_history: watchHistory.map((entry) => ({
        id: entry.id,
        progress_seconds: entry.progressSeconds,
        completed: entry.completed,
        last_watched_at: entry.lastWatchedAt,
        episode: {
          id: entry.episode.id,
          title: entry.episode.title,
          episode_number: entry.episode.episodeNumber,
          drama_id: entry.episode.dramaId,
          drama_title: entry.episode.drama?.title ?? null,
          thumbnail: entry.episode.thumbnail,
        },
      })),
      notifications: notifications.map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        description: notification.description,
        read: notification.read,
        created_at: notification.createdAt,
      })),
    };
  }

  async updateFirebaseToken(updateFirebaseTokenDto: UpdateFirebaseTokenDto) {
    let user: User | null = null;

    if (updateFirebaseTokenDto.userId) {
      user = await this.findById(updateFirebaseTokenDto.userId);
    } else if (updateFirebaseTokenDto.deviceId?.trim()) {
      user = await this.findOrCreateGuestByDeviceId(
        updateFirebaseTokenDto.deviceId,
      );
    } else {
      throw new BadRequestException('userId or deviceId is required');
    }

    user.firebaseToken = updateFirebaseTokenDto.firebaseToken.trim();
    const savedUser = await this.usersRepository.save(user);

    return {
      message: 'Firebase token updated successfully',
      user_id: savedUser.id,
      device_id: savedUser.deviceId,
    };
  }

  async updateUserDetails(
    userIdOrDeviceId: string,
    updateUserDetailsDto: UpdateUserDetailsDto,
  ) {
    const isNumericId = /^\d+$/.test(userIdOrDeviceId);
    const userId = isNumericId ? Number(userIdOrDeviceId) : undefined;
    const deviceId = isNumericId ? undefined : userIdOrDeviceId;

    let user: User | null = null;

    if (userId) {
      user = await this.findById(userId);
    } else if (deviceId) {
      user = await this.findByDeviceId(deviceId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
    } else {
      throw new BadRequestException('userId or deviceId is required');
    }

    if (updateUserDetailsDto.notificationsEnabled !== undefined) {
      user.notificationsEnabled = updateUserDetailsDto.notificationsEnabled;
    }

    const savedUser = await this.usersRepository.save(user);

    return {
      message: 'User details updated successfully',
      user: {
        id: savedUser.id,
        device_id: savedUser.deviceId,
        notifications_enabled: savedUser.notificationsEnabled,
      },
    };
  }

  async sendNotificationToUser(
    idOrDeviceId: string,
    notifyUserDto: NotifyUserDto,
  ) {
    const user = await this.findByIdOrDeviceId(idOrDeviceId);

    if (user.role === 'admin') {
      throw new NotFoundException(`User ${idOrDeviceId} not found`);
    }

    const notification = await this.notificationService.createNotification({
      userId: user.id,
      trigger: NotificationTrigger.ADMIN,
      resource_id: notifyUserDto.resourceId ?? user.id,
      title: notifyUserDto.title.trim(),
      description: notifyUserDto.description.trim(),
    });

    return {
      message: 'Notification sent successfully',
      notification: {
        id: notification.id,
        user_id: user.id,
        type: notification.type,
        title: notification.title,
        description: notification.description,
        read: notification.read,
        created_at: notification.createdAt,
      },
    };
  }

  private async findLatestSubscriptionsForUsers(userIds: number[]) {
    const latestSubscriptions = new Map<number, UserSubscription>();

    if (userIds.length === 0) {
      return latestSubscriptions;
    }

    const subscriptions = await this.userSubscriptionsRepository.find({
      where: { userId: In(userIds) },
      relations: { plan: true },
      order: { createdAt: 'DESC' },
    });

    for (const subscription of subscriptions) {
      if (!latestSubscriptions.has(subscription.userId)) {
        latestSubscriptions.set(subscription.userId, subscription);
      }
    }

    return latestSubscriptions;
  }

  private async resolveUserFromIdentifiers(
    userIdentifiers: CheckInDto,
  ): Promise<User> {
    if (userIdentifiers.userId) {
      return this.findById(userIdentifiers.userId);
    }

    if (userIdentifiers.deviceId?.trim()) {
      const user = await this.findByDeviceId(userIdentifiers.deviceId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    }

    throw new BadRequestException('userId or deviceId is required');
  }

  private getUtcDayWindow(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const nextDayStart = new Date(startOfDay);
    nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);

    return {
      startOfDayMs: startOfDay.getTime(),
      endOfDayMs: endOfDay.getTime(),
      nextDayStartMs: nextDayStart.getTime(),
      dayKey: startOfDay.toISOString().slice(0, 10),
    };
  }

  private toAdminUserListItem(
    user: User,
    latestSubscription: UserSubscription | null,
  ) {
    return {
      id: user.id,
      email: user.email,
      device_id: user.deviceId,
      user_type: this.toUserType(user),
      role: user.role,
      account_status: user.accountStatus,
      balance: user.balance,
      firebase_enabled: Boolean(user.firebaseToken),
      subscription: latestSubscription
        ? this.toSubscriptionSummary(latestSubscription)
        : null,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }

  private toUserType(user: User) {
    return user.role === 'guest' ? 'guest' : 'registered';
  }

  private toSubscriptionSummary(subscription: UserSubscription) {
    return {
      id: subscription.id,
      status: subscription.status,
      plan_id: subscription.planId,
      plan_name: subscription.plan?.name ?? null,
      starts_at: subscription.startsAt,
      ends_at: subscription.endsAt,
      auto_renew: subscription.autoRenew,
      provider: subscription.provider,
    //  provider_subscription_id: subscription.providerSubscriptionId,
      created_at: subscription.createdAt,
    };
  }
}
