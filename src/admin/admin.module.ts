import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminDramasController } from './dramas/admin-dramas.controller';
import { AdminDramasService } from './dramas/admin-dramas.service';
import { AdminAnalyticsController } from './analytics/admin-analytics.controller';
import { AdminAnalyticsService } from './analytics/admin-analytics.service';
import { AdminRewardsController } from './rewards/admin-rewards.controller';
import { AdminRewardsService } from './rewards/admin-rewards.service';
import { DramaGenre } from '../dramas/entities/drama-genre.entity';
import { Drama } from '../dramas/entities/drama.entity';
import { Episode } from '../dramas/entities/episode.entity';
import { Genre } from '../dramas/entities/genre.entity';
import { Tag } from '../dramas/entities/tag.entity';
import { MinioModule } from '../minio/minio.module';
import { RolesGuard } from '../../config/common/Guard/roles.guard';
import { RewardRule } from '../rewards/entities/reward-rule.entity';
import { RewardHistory } from '../rewards/entities/reward-history.entity';
import { RewardsModule } from '../rewards/rewards.module';
// import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { NotificationsModule } from '../notifications/notfication.module';
import { User } from '../users/entities/user.entity';
import { BillingTransaction } from '../subscriptions/entities/billing-transaction.entity';
import { UserSubscription } from '../subscriptions/entities/user-subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Drama,
      Genre,
      Episode,
      DramaGenre,
      Tag,
      RewardRule,
      RewardHistory,
      User,
      BillingTransaction,
      UserSubscription,
    ]),
    MinioModule,
    RewardsModule,
    //SubscriptionsModule,
    NotificationsModule,
  ],
  controllers: [
    AdminDramasController,
    AdminRewardsController,
    AdminAnalyticsController,
  ],
  providers: [
    AdminDramasService,
    AdminRewardsService,
    AdminAnalyticsService,
    RolesGuard,
  ],
})
export class AdminModule {}
