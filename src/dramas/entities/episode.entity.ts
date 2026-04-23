import { BaseTimestamps } from '../../../config/common/entitities/timestamp.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Drama } from './drama.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity({ name: 'episodes' })
@Unique('UQ_episodes_drama_episode_number', ['dramaId', 'episodeNumber'])
export class Episode extends BaseTimestamps {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ type: () => Drama })
  @ManyToOne(() => Drama, (drama) => drama.episodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'drama_id' })
  drama: Drama;

  @ApiProperty({ example: 1 })
  @Column({ name: 'drama_id', type: 'integer' })
  dramaId: number;

  @ApiProperty({ example: 3 })
  @Column({ name: 'episode_number', type: 'integer' })
  episodeNumber: number;

  @ApiProperty({ example: 'Episode 3' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ example: 50 })
  @Column({ name: 'coin_cost', type: 'integer', default: 20 })
  coinCost: number;

  @ApiProperty({ example: 742, description: 'Episode duration in seconds' })
  @Column({ name: 'duration_seconds', type: 'integer' })
  durationSeconds: number;

  @ApiProperty({
    example:
      'http://devrack.avads.live/storage/dramabox-drama-videos/video/1775222190512-ep3.mp4',
  })
  @Column({ name: 'video_url', type: 'varchar', length: 500 })
  videoUrl: string;

  @ApiPropertyOptional({
    example:
      'http://devrack.avads.live/storage/dramabox-episode-thumbnails/thumbnail/1775222190512-ep3.png',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail: string | null;
}
