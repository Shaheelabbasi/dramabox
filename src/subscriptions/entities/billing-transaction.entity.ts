import { BaseTimestamps } from '../../../config/common/entitities/timestamp.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UserSubscription } from './user-subscription.entity';

export enum BillingTransactionStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CHARGEBACK = 'chargeback',
}

@Entity({ name: 'billing_transactions' })
@Index('UQ_billing_transactions_provider_txn', ['provider', 'providerTxnId'], {
  unique: true,
})
@Index('IDX_billing_transactions_user_created_at', ['userId', 'createdAt'])
@Index('IDX_billing_transactions_subscription_id', ['subscriptionId'])
export class BillingTransaction extends BaseTimestamps {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 5 })
  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @ManyToOne(() => User, (user) => user.billingTransactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiPropertyOptional({ example: 2, nullable: true })
  @Column({ name: 'subscription_id', type: 'integer', nullable: true })
  subscriptionId: number | null;

  @ManyToOne(
    () => UserSubscription,
    (userSubscription) => userSubscription.billingTransactions,
    {
      nullable: true,
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({ name: 'subscription_id' })
  subscription: UserSubscription | null;

  @ApiProperty({ example: 9.99 })
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: number;

  @ApiProperty({ example: 'USD' })
  @Column({ type: 'char', length: 3, default: 'USD' })
  currency: string;

  @ApiProperty({ example: 'stripe' })
  @Column({ type: 'varchar', length: 30 })
  provider: string;

  @ApiProperty({ example: 'txn_12345' })
  @Column({ name: 'provider_txn_id', type: 'varchar', length: 150 })
  providerTxnId: string;

  @ApiProperty({
    enum: BillingTransactionStatus,
    example: BillingTransactionStatus.PAID,
  })
  @Column({ type: 'varchar', length: 20 })
  status: BillingTransactionStatus;

  @ApiPropertyOptional({
    example: { event: 'checkout.session.completed' },
    nullable: true,
  })
  @Column({ name: 'raw_payload', type: 'jsonb', nullable: true })
  rawPayload: Record<string, unknown> | null;

  @Column({ name: 'purchase_token', type: 'varchar', nullable: true })
  purchaseToken: string;
}
