import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../config/common/Guard/roles.guard';
import { UsersModule } from '../users/users.module';
import { BillingTransaction } from './entities/billing-transaction.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { UserSubscription } from './entities/user-subscription.entity';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([
      SubscriptionPlan,
      UserSubscription,
      BillingTransaction,
    ]),
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, RolesGuard],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
