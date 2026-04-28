import { BaseTimestamps } from '../../../config/common/entitities/timestamp.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SubscriptionBasePlan } from './base-plans.entity';

@Entity({ name: 'subscription_offers' })
export class SubscriptionOffer extends BaseTimestamps {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'offer_id', type: 'varchar' })
  offerId: string; // e.g. "weekly-intro-offer"

  @Column({ name: 'type', type: 'varchar' })
  type: string; // introductory | free_trial | upgrade

  @Column({
    name: 'eligibility',
    type: 'varchar',
    default: 'new_subscribers_only',
  })
  eligibility: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // Intro price shortcut fields (from phases)
  @Column({ name: 'intro_price', type: 'double precision', nullable: true })
  introPrice: number | null;

  @Column({ name: 'intro_duration_weeks', type: 'integer', nullable: true })
  introDurationWeeks: number | null;

  @Column({
    name: 'discount_percentage',
    type: 'double precision',
    nullable: true,
  })
  discountPercentage: number | null;

  @Column({ name: 'billing_periods', type: 'integer', nullable: true })
  billingPeriods: number | null;

  @Column({ name: 'free_trial_days', type: 'integer', nullable: true })
  freeTrialDays: number | null;

  // Relations
  @ManyToOne(() => SubscriptionBasePlan, (bp) => bp.offers)
  @JoinColumn({ name: 'base_plan_id' })
  basePlan: SubscriptionBasePlan;

  @Column({ name: 'base_plan_id' })
  basePlanId: number;
}
