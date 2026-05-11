import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MinioModule } from '../minio/minio.module';
import { UsersModule } from '../users/users.module';
import { DramasController } from './dramas.controller';
import { DramasService } from './dramas.service';
import { DramaGenre } from './entities/drama-genre.entity';
import { Drama } from './entities/drama.entity';
import { Episode } from './entities/episode.entity';
import { Genre } from './entities/genre.entity';
import { Tag } from './entities/tag.entity';
import { WatchHistory } from './entities/watch-history.entity';
import { UserSubscription } from '../subscriptions/entities/user-subscription.entity';
import { EpisodeViewLog } from './entities/episode-view-log.entity';
import { UserFavoriteDrama } from './entities/user-favorite-drama.entity';

@Module({
  imports: [
    MinioModule,
    UsersModule,
    TypeOrmModule.forFeature([
      Drama,
      Genre,
      Episode,
      WatchHistory,
      DramaGenre,
      Tag,
      UserSubscription,
      EpisodeViewLog,
      UserFavoriteDrama,
    ]),
  ],
  controllers: [DramasController],
  providers: [DramasService],
  exports: [DramasService],
})
export class DramasModule {}
