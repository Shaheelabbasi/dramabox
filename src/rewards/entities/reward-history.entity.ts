import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RewardRule } from './reward-rule.entity';
import { BaseTimestamps } from '../../../config/common/entitities/timestamp.entity';

export enum RewardEntryType {
  REWARD = 'reward',
  SPEND = 'spend',
  REFUND = 'refund',
  MANUAL = 'manual',
}

@Entity({ name: 'rewards_history' })
export class RewardHistory extends BaseTimestamps {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 5 })
  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiPropertyOptional({ example: 2, nullable: true })
  @Column({ name: 'rule_id', type: 'integer', nullable: true })
  ruleId: number | null;

  @ManyToOne(() => RewardRule, (rule) => rule.histories, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'rule_id' })
  rule: RewardRule | null;

  @ApiProperty({ enum: RewardEntryType, example: RewardEntryType.REWARD })
  @Column({ name: 'entry_type', type: 'varchar', length: 20 })
  entryType: RewardEntryType;

  @ApiProperty({ example: 10, description: 'Can be positive or negative' })
  @Column({ name: 'coins_delta', type: 'integer' })
  coinsDelta: number;

  @ApiPropertyOptional({ example: 'episode', nullable: true })
  @Column({
    name: 'reference_type',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  referenceType: string | null;

  @ApiPropertyOptional({ example: '12', nullable: true })
  @Column({
    name: 'reference_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  referenceId: string | null;

  @ApiProperty({ example: 'episode_complete:5:12' })
  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 255,
    unique: true,
  })
  idempotencyKey: string;
}
