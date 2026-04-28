import { BaseTimestamps } from '../../../config/common/entitities/timestamp.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SubscriptionPlan } from './subscription-plan.entity';
import { SubscriptionOffer } from './subscription-offers.entity';

@Entity({ name: 'subscription_base_plans' })
export class SubscriptionBasePlan extends BaseTimestamps {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'base_plan_id', type: 'varchar' })
  basePlanId: string; // e.g. "weekly-base"

  @Column({ name: 'type', type: 'varchar', default: 'auto-renewing' })
  type: string; // auto-renewing | prepaid

  @Column({ name: 'billing_period', type: 'varchar' })
  billingPeriod: string; // weekly | monthly | yearly

  @Column({ name: 'grace_period_days', type: 'integer', default: 3 })
  gracePeriodDays: number;

  @Column({ name: 'account_hold_days', type: 'integer', default: 27 })
  accountHoldDays: number;

  @Column({ name: 'resubscribe_allowed', type: 'boolean', default: true })
  resubscribeAllowed: boolean;

  @Column({
    name: 'customer_plan_changes',
    type: 'varchar',
    default: 'charge_at_next_billing_date',
  })
  customerPlanChanges: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // Relations
  @ManyToOne(() => SubscriptionPlan, (plan) => plan.basePlans)
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @Column({ name: 'plan_id' })
  planId: number;

  @OneToMany(() => SubscriptionOffer, (offer) => offer.basePlan, {
    cascade: true,
  })
  offers: SubscriptionOffer[];
}
