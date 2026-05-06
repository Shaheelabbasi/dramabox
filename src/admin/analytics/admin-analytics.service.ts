import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import {
  BillingTransaction,
  BillingTransactionStatus,
} from '../../subscriptions/entities/billing-transaction.entity';
import {
  UserSubscription,
  UserSubscriptionStatus,
} from '../../subscriptions/entities/user-subscription.entity';
import { BillingCycle } from '../../subscriptions/entities/subscription-plan.entity';
import {
  RewardEntryType,
  RewardHistory,
} from '../../rewards/entities/reward-history.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class AdminAnalyticsService {
  constructor(
    @InjectRepository(BillingTransaction)
    private readonly billingTransactionRepository: Repository<BillingTransaction>,
    @InjectRepository(RewardHistory)
    private readonly rewardHistoryRepository: Repository<RewardHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSubscription)
    private readonly userSubscriptionRepository: Repository<UserSubscription>,
  ) {}

  async getRevenueData() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      paidTransactions,
      paidTodayTransactions,
      paidThisMonthTransactions,
      totalUsers,
      coinSpendRow,
      totalCoinsPurchasedRow,
    ] = await Promise.all([
      this.billingTransactionRepository.find({
        where: { status: BillingTransactionStatus.PAID },
      }),
      this.billingTransactionRepository
        .find({
          where: { status: BillingTransactionStatus.PAID },
        })
        .then((rows) => rows.filter((row) => row.createdAt >= startOfToday)),
      this.billingTransactionRepository
        .createQueryBuilder('bt')
        .where('bt.status = :status', { status: BillingTransactionStatus.PAID })
        .andWhere('bt.createdAt >= :startOfMonth', { startOfMonth })
        .getMany(),
      this.userRepository.count(),
      this.rewardHistoryRepository
        .createQueryBuilder('history')
        .select('COALESCE(SUM(ABS(history.coins_delta)), 0)', 'total')
        .where('history.entry_type = :entryType', {
          entryType: RewardEntryType.SPEND,
        })
        .getRawOne<{ total: string }>(),
      this.rewardHistoryRepository
        .createQueryBuilder('history')
        .select('COALESCE(SUM(history.coins_delta), 0)', 'total')
        .where('history.entry_type = :entryType', {
          entryType: RewardEntryType.REWARD,
        })
        .andWhere('history.coins_delta > 0')
        .getRawOne<{ total: string }>(),
    ]);

    const sumBillingAmounts = (transactions: BillingTransaction[]) =>
      transactions.reduce(
        (sum, transaction) => sum + Number(transaction.amount),
        0,
      );

    const totalRevenue = sumBillingAmounts(paidTransactions);
    const revenueToday = sumBillingAmounts(paidTodayTransactions);
    const revenueThisMonth = sumBillingAmounts(paidThisMonthTransactions);
    const avgRevenuePerUser = totalUsers > 0 ? totalRevenue / totalUsers : 0;
    const totalCoinsSpent = Number(coinSpendRow?.total ?? 0);
    const totalCoinsPurchased = Number(totalCoinsPurchasedRow?.total ?? 0);

    return {
      revenueData: {
        total_revenue: totalRevenue,
        avg_revenue_per_user: avgRevenuePerUser,
        revenue_today: revenueToday,
        revenue_this_month: revenueThisMonth,
        coin_revenue_all_time: totalRevenue,
        subscription_revenue: totalRevenue,
        total_coins_purchased: totalCoinsPurchased,
        total_coins_spent: totalCoinsSpent,
      },
    };
  }

  async getSubscriberData() {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(
      startOfToday.getFullYear(),
      startOfToday.getMonth(),
      1,
    );
    const activeStatuses = [
      UserSubscriptionStatus.ACTIVE,
      UserSubscriptionStatus.GRACE_PERIOD,
    ];

    const [activeSubscriptions, newTodaySubs, newThisMonthSubs, totalUsers, expiredThisMonth] =
      await Promise.all([
        this.userSubscriptionRepository.find({
          where: {
            status: In(activeStatuses),
            startsAt: LessThanOrEqual(now),
            endsAt: MoreThan(now),
          },
          relations: { plan: true },
        }),
        this.userSubscriptionRepository.find({
          where: {
            status: In(activeStatuses),
            createdAt: MoreThan(startOfToday),
          },
        }),
        this.userSubscriptionRepository.find({
          where: {
            status: In(activeStatuses),
            createdAt: MoreThan(startOfMonth),
          },
        }),
        this.userRepository.count(),
        this.userSubscriptionRepository
          .createQueryBuilder('subscription')
          .where('subscription.status IN (:...statuses)', {
            statuses: [
              UserSubscriptionStatus.EXPIRED,
              UserSubscriptionStatus.CANCELLED,
            ],
          })
          .andWhere('subscription.endsAt >= :startOfMonth', {
            startOfMonth: startOfMonth.getTime(),
          })
          .andWhere('subscription.endsAt < :now', { now })
          .getCount(),
      ]);

    const toUniqueUserIds = (subs: UserSubscription[]) =>
      new Set(subs.map((s) => s.userId));

    const activeUserIds = toUniqueUserIds(activeSubscriptions);
    const weeklyUserIds = new Set(
      activeSubscriptions
        .filter((s) => s.plan?.billingCycle === BillingCycle.WEEKLY)
        .map((s) => s.userId),
    );
    const annualUserIds = new Set(
      activeSubscriptions
        .filter((s) => s.plan?.billingCycle === BillingCycle.YEARLY)
        .map((s) => s.userId),
    );

    const newTodayUserIds = toUniqueUserIds(newTodaySubs);
    const newThisMonthUserIds = toUniqueUserIds(newThisMonthSubs);

    const activeSubscribers = activeUserIds.size;
    const weeklyPlanSubscribers = weeklyUserIds.size;
    const annualPlanSubscribers = annualUserIds.size;
    const newSubscribersToday = newTodayUserIds.size;
    const newSubscribersThisMonth = newThisMonthUserIds.size;

    const percent = (value: number, total: number) =>
      total > 0 ? Number(((value / total) * 100).toFixed(2)) : 0;

    const newSubscribersTodayPercent = percent(
      newSubscribersToday,
      activeSubscribers,
    );
    const newSubscribersThisMonthPercent = percent(
      newSubscribersThisMonth,
      activeSubscribers,
    );
    const subscriberRatePercent = percent(activeSubscribers, totalUsers);
    const churnRateMonthlyPercent = percent(expiredThisMonth, activeSubscribers);

    return {
      activeSubscribers,
      weeklyPlanSubscribers,
      annualPlanSubscribers,
      newSubscribersThisMonthPercent,
      newSubscribersToday,
      newSubscribersTodayPercent,
      subscriberRatePercent,
      expiredThisMonth,
      churnRateMonthlyPercent,
    };
  }
}
