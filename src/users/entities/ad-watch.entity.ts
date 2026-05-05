import { ApiProperty } from '@nestjs/swagger';
import { BaseTimestamps } from '../../../config/common/entitities/timestamp.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'ad_watches' })
export class AdWatch extends BaseTimestamps {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ example: 'ad_watch_completed' })
  @Column({ name: 'event_type', type: 'varchar', length: 100, default: 'ad_watch_completed' })
  eventType: string;
}
