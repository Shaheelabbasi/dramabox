import { BaseTimestamps } from '../../../config/common/entitities/timestamp.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Drama } from './drama.entity';

@Entity({ name: 'tags' })
export class Tag extends BaseTimestamps {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'trending' })
  @Column({ type: 'varchar', length: 50, unique: true })
  slug: string;

  @ApiProperty({ example: 'Trending' })
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @ApiProperty({ example: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Drama, (drama) => drama.tag)
  dramas: Drama[];
}
