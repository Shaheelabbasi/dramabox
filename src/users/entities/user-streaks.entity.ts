// user-streak.entity.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseTimestamps } from '../../../config/common/entitities/timestamp.entity';
import { User } from './user.entity';

@Entity({ name: 'user_streaks' })
export class UserStreak extends BaseTimestamps {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 5 })
  @Column({ name: 'user_id', type: 'integer', unique: true })
  userId: number;

  @ApiProperty({ type: () => User })
  @OneToOne(() => User, (user) => user.streak, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ example: 7 })
  @Column({ name: 'current_streak', type: 'integer', default: 0 })
  currentStreak: number;

  @ApiProperty({ example: 30 })
  @Column({ name: 'longest_streak', type: 'integer', default: 0 })
  longestStreak: number;

  @ApiPropertyOptional({ example: 1776211200000, nullable: true })
  @Column({
    name: 'last_check_in_day',
    type: 'bigint',
    nullable: true,
  })
  lastCheckInDay: number | null; // UTC day-start ms
}
