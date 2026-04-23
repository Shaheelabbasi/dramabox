import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Drama } from './drama.entity';
import { Genre } from './genre.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'drama_genres' })
@Unique('UQ_drama_genres_drama_genre', ['drama', 'genre'])
export class DramaGenre {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ type: () => Drama })
  @ManyToOne(() => Drama, (drama) => drama.dramaGenres, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'drama_id' })
  drama: Drama;

  @ApiProperty({ type: () => Genre })
  @ManyToOne(() => Genre, (genre) => genre.dramaGenres, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'genre_id' })
  genre: Genre;
}
