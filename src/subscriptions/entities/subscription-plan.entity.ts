import { BaseTimestamps } from '../../../config/common/entitities/timestamp.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserSubscription } from './user-subscription.entity';

export enum BillingCycle {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Entity({ name: 'subscription_plans' })
export class SubscriptionPlan extends BaseTimestamps {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Premium Monthly' })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiPropertyOptional({
    example: 'Unlimited viewing for 30 days with premium content access.',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @ApiProperty({ example: 9.99 })
  @Column({ type: 'double precision' })
  price: number;

  @ApiProperty({ example: 'USD' })
  @Column({ type: 'char', length: 3, default: 'USD' })
  currency: string;

  @ApiProperty({ example: 30 })
  @Column({ name: 'duration_days', type: 'integer' })
  durationDays: number;

  @ApiProperty({ enum: BillingCycle, example: BillingCycle.MONTHLY })
  @Column({ name: 'billing_cycle', type: 'varchar', length: 20 })
  billingCycle: BillingCycle;

  @ApiProperty({ example: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(
    () => UserSubscription,
    (userSubscription) => userSubscription.plan,
  )
  userSubscriptions: UserSubscription[];
}
