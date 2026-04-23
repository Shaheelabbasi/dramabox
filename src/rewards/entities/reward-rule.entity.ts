import { BaseTimestamps } from '../../../config/common/entitities/timestamp.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RewardHistory } from './reward-history.entity';

@Entity({ name: 'reward_rules' })
export class RewardRule extends BaseTimestamps {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'daily_login' })
  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  @ApiProperty({ example: 'Daily Login Reward' })
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @ApiProperty({ example: 10 })
  @Column({ type: 'integer' })
  coins: number;

  @ApiProperty({ example: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: 86400, nullable: true })
  @Column({ name: 'cooldown_seconds', type: 'integer', nullable: true })
  cooldownSeconds: number | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @Column({ name: 'max_per_day', type: 'integer', nullable: true })
  maxPerDay: number | null;

  @OneToMany(() => RewardHistory, (history) => history.rule)
  histories: RewardHistory[];
}
