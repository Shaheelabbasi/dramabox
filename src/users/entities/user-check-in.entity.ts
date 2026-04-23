import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseTimestamps } from '../../../config/common/entitities/timestamp.entity';
import { User } from './user.entity';

@Entity({ name: 'user_check_ins' })
export class UserCheckIn extends BaseTimestamps {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 5 })
  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, (user) => user.checkIns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ example: 1776297600000 })
  @Column({ name: 'check_in_at', type: 'bigint' })
  checkInAt: number;
}
