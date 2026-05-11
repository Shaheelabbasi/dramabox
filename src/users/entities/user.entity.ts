import { BaseTimestamps } from '../../../config/common/entitities/timestamp.entity';
import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingTransaction } from '../../subscriptions/entities/billing-transaction.entity';
import { Notifications } from '../../notifications/entities/notification.entity';
import { UserSubscription } from '../../subscriptions/entities/user-subscription.entity';
import { AccountStatus } from '../enums/account-status.enum';
import { UserCheckIn } from '../entities/user-check-in.entity';
import { UserStreak } from './user-streaks.entity';

@Entity({ name: 'users' })
export class User extends BaseTimestamps {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiPropertyOptional({ example: 'device-abc-123', nullable: true })
  @Column({
    name: 'device_id',
    type: 'varchar',
    length: 255,
    nullable: true,
    unique: true,
  })
  deviceId: string | null;

  @ApiProperty({ example: 'admin@dramabox.local' })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @ApiProperty({ example: '$2b$10$hashedPassword' })
  @Column({ name: 'password', type: 'varchar', length: 255 })
  password: string;

  @ApiProperty({ example: 'admin' })
  @Column({ name: 'role', type: 'varchar', length: 50, default: 'user' })
  role: string;

  @ApiProperty({ enum: AccountStatus, example: AccountStatus.ACTIVE })
  @Column({
    name: 'account_status',
    type: 'varchar',
    length: 50,
    default: AccountStatus.ACTIVE,
  })
  accountStatus: AccountStatus;

  @ApiProperty({ example: 0 })
  @Column({ type: 'integer', default: 0 })
  balance: number;

  @ApiPropertyOptional({ example: 'fcm-token-xyz', nullable: true })
  @Column({
    name: 'firebase_token',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  firebaseToken: string | null;

  @ApiProperty({ example: true })
  @Column({ name: 'notifications_enabled', type: 'boolean', default: false })
  notificationsEnabled: boolean;

  @OneToMany(
    () => UserSubscription,
    (userSubscription) => userSubscription.user,
  )
  userSubscriptions: UserSubscription[];

  @OneToMany(
    () => BillingTransaction,
    (billingTransaction) => billingTransaction.user,
  )
  billingTransactions: BillingTransaction[];

  @OneToMany(() => Notifications, (notification) => notification.user)
  notifications: Notifications[];

  @OneToOne(() => UserStreak, (streak) => streak.user)
  streak: UserStreak;

  @OneToMany(() => UserCheckIn, (checkIn) => checkIn.user)
  checkIns: UserCheckIn[];
}
