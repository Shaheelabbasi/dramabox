import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { PlayEpisodeDto } from './dto/play-episode.dto';
import { DramasService } from './dramas.service';
import { ListDramaEpisodesDto } from './dto/list-drama-episodes.dto';
import { ListDramasDto } from './dto/list-dramas.dto';
import { UpdateWatchHistoryDto } from './dto/update-watch-history.dto';

@Controller()
export class DramasController {
  constructor(private readonly dramasService: DramasService) {}

  @Get('genres')
  findGenres() {
    return this.dramasService.findGenres();
  }

  @Get('dramas')
  findAll(@Query() listDramasDto: ListDramasDto) {
    return this.dramasService.findAll(listDramasDto);
  }

  @Get('dramas/:id/episodes')
  findEpisodes(
    @Param('id', ParseIntPipe) id: number,
    @Query() listDramaEpisodesDto?: ListDramaEpisodesDto,
  ) {
    return this.dramasService.findEpisodesByDrama(
      id,
      listDramaEpisodesDto?.userId,
      listDramaEpisodesDto?.deviceId,
      listDramaEpisodesDto,
    );
  }

  @Get('dramas/:id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('userId') userId?: string,
    @Query('deviceId') deviceId?: string,
  ) {
    return this.dramasService.findOne(
      id,
      this.parseOptionalUserId(userId),
      deviceId,
    );
  }

  @Get('episodes/:id/watch-history')
  getWatchHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query('userId') userId?: string,
    @Query('deviceId') deviceId?: string,
  ) {
    return this.dramasService.getWatchHistory(
      id,
      this.parseOptionalUserId(userId),
      deviceId,
    );
  }

  @Post('episodes/:id/play')
  playEpisode(
    @Param('id', ParseIntPipe) episodeId: number,
    @Body() playEpisodeDto: PlayEpisodeDto,
  ) {
    return this.dramasService.playEpisode(
      episodeId,
      playEpisodeDto.userId,
      playEpisodeDto.deviceId,
      playEpisodeDto.unlockWithCoins,
    );
  }

  @Post('episodes/:id/watch-history')
  upsertWatchHistory(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWatchHistoryDto: UpdateWatchHistoryDto,
  ) {
    return this.dramasService.upsertWatchHistory(id, updateWatchHistoryDto);
  }

  private parseOptionalUserId(userId?: string): number | undefined {
    if (!userId) {
      return undefined;
    }

    const parsedUserId = Number.parseInt(userId, 10);

    if (Number.isNaN(parsedUserId)) {
      return undefined;
    }

    return parsedUserId;
  }
}
