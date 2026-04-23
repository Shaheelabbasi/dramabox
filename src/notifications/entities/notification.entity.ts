import { ApiProperty } from '@nestjs/swagger';
import { BaseTimestamps } from '../../../config/common/entitities/timestamp.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationAudience } from '../enums/notification-audience.enum';
import { NotificationTrigger } from '../enums/notification-trigger.enum';
import { NotificationType } from '../enums/notification-type.enum';

@Entity('notifications')
export class Notifications extends BaseTimestamps {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ type: 'varchar', length: 100, nullable: true })
  type: NotificationType | null;

  @ApiProperty({ enum: NotificationTrigger })
  @Column({ type: 'varchar', length: 50, default: NotificationTrigger.AUTO })
  trigger: NotificationTrigger;

  @ApiProperty({ enum: NotificationAudience })
  @Column({
    type: 'varchar',
    length: 50,
    default: NotificationAudience.ALL_USERS,
  })
  audience: NotificationAudience;

  @ApiProperty()
  @Column({ name: 'resource_id', type: 'integer' })
  resource_id: number;

  @ApiProperty()
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty()
  @Column({ type: 'text' })
  description: string;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  read: boolean;

  @ApiProperty()
  @Column({ name: 'recipient_count', type: 'integer', default: 0 })
  recipientCount: number;

  @ManyToOne(() => User, (user) => user.notifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
