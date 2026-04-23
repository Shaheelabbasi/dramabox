import { BaseTimestamps } from '../../../config/common/entitities/timestamp.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DramaGenre } from './drama-genre.entity';
import { Episode } from './episode.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Tag } from './tag.entity';

@Entity({ name: 'dramas' })
export class Drama extends BaseTimestamps {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Broken Destiny' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ example: 'A revenge romance between two rival heirs' })
  @Column({ type: 'text' })
  description: string;

  @ApiPropertyOptional({
    example:
      'http://devrack.avads.live/storage/dramabox-drama-thumbnails/thumbnail/1775222190512-control.png',
    nullable: true,
  })
  @Column({ name: 'thumbnail_url', type: 'varchar', nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty({ example: false })
  @Column({ name: 'is_exclusive', type: 'boolean', default: false })
  isExclusive: boolean;

  @ApiProperty({ example: 12 })
  @Column({ name: 'total_episodes', type: 'integer', default: 0 })
  totalEpisodes: number;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @Column({ name: 'tag_id', type: 'integer', nullable: true })
  tagId: number | null;

  @ApiPropertyOptional({ type: () => Tag, nullable: true })
  @ManyToOne(() => Tag, (tag) => tag.dramas, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tag_id' })
  tag: Tag | null;

  @ApiProperty({ type: () => [Episode] })
  @OneToMany(() => Episode, (episode) => episode.drama)
  episodes: Episode[];

  @ApiProperty({ type: () => [DramaGenre] })
  @OneToMany(() => DramaGenre, (dramaGenre) => dramaGenre.drama)
  dramaGenres: DramaGenre[];
}
