import { BaseTimestamps } from '../../../config/common/entitities/timestamp.entity';
import { ApiProperty,} from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { BillingTransaction } from './billing-transaction.entity';
import { SubscriptionPlan } from './subscription-plan.entity';

export enum UserSubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  GRACE_PERIOD = 'grace_period',
  PENDING = 'pending',
}

@Entity({ name: 'user_subscriptions' })
export class UserSubscription extends BaseTimestamps {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 10 })
  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @ManyToOne(() => User, (user) => user.userSubscriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ example: 1 })
  @Column({ name: 'plan_id', type: 'integer' })
  planId: number;

  @ManyToOne(() => SubscriptionPlan, (plan) => plan.userSubscriptions)
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @ApiProperty({
    enum: UserSubscriptionStatus,
    example: UserSubscriptionStatus.ACTIVE,
  })
  @Column({ type: 'varchar', length: 20 })
  status: UserSubscriptionStatus;

  @ApiProperty({
    example: 1775238000000,
    description: 'Subscription start time in Unix milliseconds',
  })
  @Column({
    name: 'starts_at',
    type: 'bigint',
    transformer: {
      to: (value?: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  startsAt: number;

  @ApiProperty({
    example: 1777830000000,
    description: 'Subscription end time in Unix milliseconds',
  })
  @Column({
    name: 'ends_at',
    type: 'bigint',
    transformer: {
      to: (value?: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  endsAt: number;

  @ApiProperty({ example: false })
  @Column({ name: 'auto_renew', type: 'boolean', default: false })
  autoRenew: boolean;

  @ApiProperty({ example: 'stripe' })
  @Column({ type: 'varchar', length: 30 })
  provider: string;

  @Column({
    name: 'purchase_token',
    type: 'varchar',
    nullable: true,
  })
  purchaseToken: string;

  @Column({
    name: 'provider_status',
    type: 'varchar',
    nullable: true,
  })
  providerStatus: string;

  @Column({ name: 'is_acknowledged', type: 'boolean', default: false })
  isAcknowledged: boolean;

  @Column({ name: 'product_id', type: 'varchar', nullable: true })
  productId: string;

  @OneToMany(
    () => BillingTransaction,
    (billingTransaction) => billingTransaction.subscription,
  )
  billingTransactions: BillingTransaction[];
}
