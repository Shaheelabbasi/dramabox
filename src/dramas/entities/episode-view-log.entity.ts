import { User } from 'src/users/entities/user.entity';
import { Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn, Unique } from 'typeorm';
import { Episode } from './episode.entity';
import { BaseTimestamps } from 'config/common/entitities/timestamp.entity';

@Entity('episode_view_log')
@Unique('UQ_episode_view_log', ['user', 'episode'])
export class EpisodeViewLog extends BaseTimestamps {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Episode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'episode_id' })
  episode: Episode;
}
