import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  //Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Drama } from './drama.entity';
import { Episode } from './episode.entity';

@Entity({ name: 'favorite_dramas' })
//@Unique('UQ_user_favorite_dramas_user_drama', ['user', 'drama'])
export class UserFavoriteDrama {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ type: () => Drama })
  @ManyToOne(() => Drama, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'drama_id' })
  drama: Drama;

  @ApiProperty({ type: () => Episode })
  @ManyToOne(() => Episode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'episode_id' })
  episode: Episode;
}
