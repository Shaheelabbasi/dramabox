import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../config/common/Guard/roles.guard';
import { Drama } from '../dramas/entities/drama.entity';
import { Episode } from '../dramas/entities/episode.entity';
import { UserFavoriteDrama } from '../dramas/entities/user-favorite-drama.entity';
import { WatchHistory } from '../dramas/entities/watch-history.entity';
import { NotificationsModule } from '../notifications/notfication.module';
import { Notifications } from '../notifications/entities/notification.entity';
import { RewardHistory } from '../rewards/entities/reward-history.entity';
import { RewardsModule } from '../rewards/rewards.module';
import { BillingTransaction } from '../subscriptions/entities/billing-transaction.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { UserSubscription } from '../subscriptions/entities/user-subscription.entity';
import { AdminUsersController } from './admin-users.controller';
import { UserCheckIn } from './entities/user-check-in.entity';
import { AdWatch } from './entities/ad-watch.entity';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UserStreak } from './entities/user-streaks.entity';

@Module({
  imports: [
    NotificationsModule,
    RewardsModule,
    TypeOrmModule.forFeature([
      User,
      UserSubscription,
      SubscriptionPlan,
      BillingTransaction,
      RewardHistory,
      WatchHistory,
      UserFavoriteDrama,
      AdWatch,
      Notifications,
      UserCheckIn,
      Drama,
      Episode,
      UserStreak
    ]),
  ],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService, RolesGuard],
  exports: [UsersService],
})
export class UsersModule {}
