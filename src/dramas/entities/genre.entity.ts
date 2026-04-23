import { BaseTimestamps } from '../../../config/common/entitities/timestamp.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DramaGenre } from './drama-genre.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'genres' })
export class Genre extends BaseTimestamps {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Romance' })
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @ApiProperty({ type: () => [DramaGenre] })
  @OneToMany(() => DramaGenre, (dramaGenre) => dramaGenre.genre)
  dramaGenres: DramaGenre[];
}
