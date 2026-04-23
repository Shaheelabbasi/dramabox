import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  //Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Episode } from './episode.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Drama } from './drama.entity';
// import { TimeStamps } from 'config/common/entitities/timestamp.entity';

@Entity({ name: 'watch_history' })
//@Unique('UQ_watch_history_user_episode', ['user', 'episode'])
export class WatchHistory {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ type: () => Episode })
  @ManyToOne(() => Episode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'episode_id' })
  episode: Episode;

  @ApiProperty({ type: () => Drama })
  @ManyToOne(() => Drama, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'drama_id' })
  drama: Drama;

  @ApiProperty({ example: 120 })
  @Column({ name: 'progress_seconds', type: 'integer', default: 0 })
  progressSeconds: number;

  @ApiProperty({ example: false })
  @Column({ type: 'boolean', default: false })
  completed: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  @Column({
    name: 'last_watched_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastWatchedAt: Date;
}
