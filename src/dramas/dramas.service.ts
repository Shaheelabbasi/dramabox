import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { UpdateWatchHistoryDto } from './dto/update-watch-history.dto';
import { PageDto } from '../../config/common/dto/page.dto';
import { PageMetaDto } from '../../config/common/dto/page-meta.dto';
import {
  Order,
  PageOptionsDto,
} from '../../config/common/dto/page-options.dto';
import { ListDramasDto } from './dto/list-dramas.dto';
import { Drama } from './entities/drama.entity';
import { Episode } from './entities/episode.entity';
import { Genre } from './entities/genre.entity';
import { WatchHistory } from './entities/watch-history.entity';
import {
  UserSubscription,
  UserSubscriptionStatus,
} from '../subscriptions/entities/user-subscription.entity';
import {
  RewardEntryType,
  RewardHistory,
} from '../rewards/entities/reward-history.entity';
import { EpisodeViewLog } from './entities/episode-view-log.entity';

@Injectable()
export class DramasService {
  constructor(
    @InjectRepository(Drama)
    private readonly dramaRepository: Repository<Drama>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
    @InjectRepository(Episode)
    private readonly episodeRepository: Repository<Episode>,
    @InjectRepository(WatchHistory)
    private readonly watchHistoryRepository: Repository<WatchHistory>,
    @InjectRepository(UserSubscription)
    private readonly userSubscriptionRepository: Repository<UserSubscription>,

    @InjectRepository(EpisodeViewLog)
    private readonly episodeViewLogRepository: Repository<EpisodeViewLog>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async findAll(
    pageOptionsDto: ListDramasDto = new ListDramasDto(),
  ): Promise<PageDto<ReturnType<DramasService['toDramaListItem']>>> {
    const queryBuilder = this.dramaRepository
      .createQueryBuilder('drama')
      .leftJoinAndSelect('drama.dramaGenres', 'dramaGenre')
      .leftJoinAndSelect('dramaGenre.genre', 'genre')
      .leftJoinAndSelect('drama.tag', 'tag')
      .orderBy('drama.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    if (pageOptionsDto.tagId) {
      queryBuilder.andWhere('drama.tagId = :tagId', {
        tagId: pageOptionsDto.tagId,
      });
    }

    if (pageOptionsDto.tag?.trim()) {
      queryBuilder.andWhere('LOWER(tag.slug) = :tagSlug', {
        tagSlug: pageOptionsDto.tag.trim().toLowerCase(),
      });
    }

    if (pageOptionsDto.genreId) {
      queryBuilder.andWhere('genre.id = :genreId', {
        genreId: pageOptionsDto.genreId,
      });
    }

    if (pageOptionsDto.genre?.trim()) {
      queryBuilder.andWhere('LOWER(genre.name) = :genreName', {
        genreName: pageOptionsDto.genre.trim().toLowerCase(),
      });
    }

    if (pageOptionsDto.search?.trim()) {
      queryBuilder.andWhere(
        '(drama.title ILIKE :search OR drama.description ILIKE :search)',
        {
          search: `%${pageOptionsDto.search.trim()}%`,
        },
      );
    }

    const [dramas, itemCount] = await queryBuilder.getManyAndCount();

    const data = dramas.map((drama) => this.toDramaListItem(drama));
    const meta = new PageMetaDto({ pageOptionsDto, itemCount });

    return new PageDto(data, meta);
  }

  async findOne(id: number, userId?: number, deviceId?: string) {
    const drama = await this.dramaRepository.findOne({
      where: { id },
      relations: {
        dramaGenres: {
          genre: true,
        },
        tag: true,
        episodes: true,
      },
      order: {
        episodes: {
          episodeNumber: 'ASC',
        },
      },
    });

    if (!drama) {
      throw new NotFoundException(`Drama ${id} not found`);
    }

    const viewer = await this.resolveViewer(userId, deviceId, false);
    const episodeAccess = await this.getEpisodeAccessMap(
      drama.episodes,
      viewer?.id,
    );

    return {
      id: drama.id,
      title: drama.title,
      description: drama.description,
      thumbnail_url: drama.thumbnailUrl,
      is_exclusive: drama.isExclusive,
      total_episodes: drama.totalEpisodes,
      tag: drama.tag
        ? {
            id: drama.tag.id,
            slug: drama.tag.slug,
            name: drama.tag.name,
          }
        : null,
      genres: drama.dramaGenres.map((dramaGenre) => ({
        id: dramaGenre.genre.id,
        name: dramaGenre.genre.name,
      })),
      episodes: drama.episodes.map((episode) =>
        this.toEpisodeResponse(episode, episodeAccess.get(episode.id)),
      ),
      created_at: drama.createdAt,
      updated_at: drama.updatedAt,
    };
  }

  async findGenres() {
    const genres = await this.genreRepository.find({
      order: {
        id: 'ASC',
      },
      select: {
        id: true,
        name: true,
      },
    });

    return genres;
  }

  async findEpisodesByDrama(
    dramaId: number,
    userId?: number,
    deviceId?: string,
    pageOptionsDto: PageOptionsDto = new PageOptionsDto(),
  ) {
    const drama = await this.dramaRepository.findOne({
      where: { id: dramaId },
    });

    if (!drama) {
      throw new NotFoundException(`Drama ${dramaId} not found`);
    }

    const [episodes, itemCount] = await this.episodeRepository.findAndCount({
      where: { dramaId },
      order: {
        episodeNumber: Order.ASC,
      },
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
    });

    const viewer = await this.resolveViewer(userId, deviceId, false);
    const episodeAccess = await this.getEpisodeAccessMap(episodes, viewer?.id);

    const data = episodes.map((episode) =>
      this.toEpisodeResponse(episode, episodeAccess.get(episode.id)),
    );
    const meta = new PageMetaDto({ pageOptionsDto, itemCount });

    return new PageDto(data, meta);
  }

  async getWatchHistory(episodeId: number, userId?: number, deviceId?: string) {
    const episode = await this.ensureEpisodeExists(episodeId);
    const viewer = await this.resolveViewer(userId, deviceId, false);

    console.log('sdsdsdsds');
    if (!viewer) {
      throw new BadRequestException('userId or deviceId is required');
    }

    const drama = await this.dramaRepository.findOne({
      where: { id: episode.dramaId },
      relations: ['dramaGenres', 'dramaGenres.genre'],
    });

    if (!drama) {
      throw new NotFoundException('Drama not found');
    }

    const watchedEpisodesCount = await this.watchHistoryRepository.count({
      where: {
        user: { id: viewer.id },
        episode: { dramaId: episode.dramaId },
      },
    });

    const lastWatchedEpisode = await this.watchHistoryRepository.findOne({
      where: {
        user: { id: viewer.id },
        episode: { dramaId: episode.dramaId },
      },
      relations: ['episode'],
      order: { lastWatchedAt: 'DESC' },
    });

    const watchHistory = await this.watchHistoryRepository.findOne({
      where: {
        episode: { id: episodeId },
        user: { id: viewer.id },
      },
      relations: {
        episode: true,
        user: true,
      },
    });

    if (!watchHistory) {
      return {
        episode_id: episodeId,
        user_id: viewer.id,
        progress_seconds: 0,
        completed: false,
        last_watched_at: null,
        drama: {
          id: drama.id,
          title: drama.title,
          thumbnail: drama.thumbnailUrl,
          genres: drama.dramaGenres.map((dg) => ({
            id: dg.genre.id,
            name: dg.genre.name,
          })),
          total_episodes: drama.totalEpisodes,
          watched_episodes: watchedEpisodesCount,
          last_watched_episode: lastWatchedEpisode
            ? {
                id: lastWatchedEpisode.episode.id,
                episode_number: lastWatchedEpisode.episode.episodeNumber,
                title: lastWatchedEpisode.episode.title,
              }
            : null,
        },
      };
    }

    return {
      ...this.toWatchHistoryResponse(watchHistory),
      drama: {
        id: drama.id,
        title: drama.title,
        thumbnail: drama.thumbnailUrl,
        genres: drama.dramaGenres.map((dg) => ({
          id: dg.genre.id,
          name: dg.genre.name,
        })),
        total_episodes: drama.totalEpisodes,
        watched_episodes: watchedEpisodesCount,
        last_watched_episode: lastWatchedEpisode
          ? {
              id: lastWatchedEpisode.episode.id,
              episode_number: lastWatchedEpisode.episode.episodeNumber,
              title: lastWatchedEpisode.episode.title,
            }
          : null,
      },
    };
  }

  async playEpisode(
    episodeId: number,
    userId?: number,
    deviceId?: string,
    unlockWithCoins?: boolean,
  ) {
    const episode = await this.ensureEpisodeExists(episodeId);
    const episodeUnlockCost = this.getEpisodeUnlockCost(episode);

    const viewer = await this.resolveViewer(userId, deviceId, true);

    if (!viewer) {
      throw new BadRequestException('userId or deviceId is required');
    }

    // =========================================
    // ✅ GLOBAL 3 EPISODE LIMIT (VIEW LOG BASED)
    // =========================================
    const watchedEpisodesCount = await this.episodeViewLogRepository.count({
      where: {
        user: { id: viewer.id },
      },
    });

    const hasActiveSubscription = await this.hasActiveSubscription(viewer.id);
    const freeEpisodeLimit = this.getFreeEpisodeLimit(); // 3

    if (!hasActiveSubscription && watchedEpisodesCount >= freeEpisodeLimit) {
      if (!unlockWithCoins) {
        throw new ForbiddenException({
          message: `You have reached the ${freeEpisodeLimit} episode limit on the basic plan`,
          reason: 'global_episode_limit_reached',
          can_watch: false,
          watched_episodes_count: watchedEpisodesCount,
          unlock_with_coins_required: true,
          required_coins: episodeUnlockCost,
        });
      }
    }

    // =========================================
    // WATCH HISTORY (PER DRAMA RESUME LOGIC)
    // =========================================
    let watchHistory = await this.watchHistoryRepository.findOne({
      where: {
        drama: { id: episode.dramaId },
        user: { id: viewer.id },
      },
      relations: {
        episode: true,
        user: true,
      },
    });

    const isResuming = Boolean(watchHistory);

    // =========================================
    // FIRST TIME / CREATE / COIN FLOW
    // =========================================
    if (!watchHistory) {
      const startedEpisodesCount = await this.episodeViewLogRepository.count({
        where: {
          user: { id: viewer.id },
        },
      });

      const hasActiveSubscription = await this.hasActiveSubscription(viewer.id);
      const freeEpisodeLimit = this.getFreeEpisodeLimit();

      // 🔥 BASIC LIMIT CHECK (ONLY FOR NON-SUBSCRIBED USERS)
      if (!hasActiveSubscription && startedEpisodesCount >= freeEpisodeLimit) {
        if (!unlockWithCoins) {
          throw new ForbiddenException({
            message: `You have reached the ${freeEpisodeLimit} episode limit on the basic plan`,
            reason: 'basic_plan_limit_reached',
            can_watch: false,
            started_episodes_count: startedEpisodesCount,
            unlock_with_coins_required: true,
            required_coins: episodeUnlockCost,
          });
        }

        // ===============================
        // 💰 COIN UNLOCK FLOW (UNCHANGED)
        // ===============================
        const unlockIdempotencyKey = `episode_unlock:${viewer.id}:${episode.id}`;

        try {
          const unlockResult = await this.dataSource.transaction(
            async (manager) => {
              const userRepository = manager.getRepository(User);
              const watchHistoryRepository =
                manager.getRepository(WatchHistory);
              const rewardsHistoryRepository =
                manager.getRepository(RewardHistory);

              const currentUser = await userRepository.findOne({
                where: { id: viewer.id },
              });

              if (!currentUser) {
                throw new NotFoundException(`User ${viewer.id} not found`);
              }

              if (currentUser.balance < episodeUnlockCost) {
                throw new ForbiddenException({
                  message: `Insufficient balance`,
                  can_watch: false,
                  required_coins: episodeUnlockCost,
                  current_balance: currentUser.balance,
                });
              }

              await rewardsHistoryRepository.save(
                rewardsHistoryRepository.create({
                  userId: currentUser.id,
                  ruleId: null,
                  entryType: RewardEntryType.SPEND,
                  coinsDelta: -episodeUnlockCost,
                  referenceType: 'episode_unlock',
                  referenceId: String(episode.id),
                  idempotencyKey: unlockIdempotencyKey,
                }),
              );

              currentUser.balance -= episodeUnlockCost;
              await userRepository.save(currentUser);

              const createdWatchHistory = await watchHistoryRepository.save(
                watchHistoryRepository.create({
                  user: { id: currentUser.id } as User,
                  episode: { id: episode.id } as Episode,
                  drama: { id: episode.dramaId },
                  progressSeconds: 0,
                  completed: false,
                  lastWatchedAt: new Date(),
                }),
              );

              return {
                watchHistory: createdWatchHistory,
                balance: currentUser.balance,
              };
            },
          );

          watchHistory = unlockResult.watchHistory;
        } catch (error) {
          if (
            error instanceof QueryFailedError &&
            (error as any).code === '23505'
          ) {
            watchHistory = await this.watchHistoryRepository.findOne({
              where: {
                drama: { id: episode.dramaId },
                user: { id: viewer.id },
              },
              relations: {
                episode: true,
                user: true,
              },
            });
          } else {
            throw error;
          }
        }
      }

      // normal create
      if (!watchHistory) {
        watchHistory = await this.watchHistoryRepository.save(
          this.watchHistoryRepository.create({
            user: { id: viewer.id } as User,
            episode: { id: episode.id } as Episode,
            drama: { id: episode.dramaId },
            progressSeconds: 0,
            completed: false,
            lastWatchedAt: new Date(),
          }),
        );
      }
    } else {
      watchHistory.lastWatchedAt = new Date();
      watchHistory.episode = { id: episode.id } as Episode;
      watchHistory = await this.watchHistoryRepository.save(watchHistory);
    }

    // =========================================
    // ✅ VIEW LOG (GLOBAL LIMIT TRACKING)
    // =========================================
    await this.episodeViewLogRepository
      .createQueryBuilder()
      .insert()
      .into(EpisodeViewLog)
      .values({
        user: { id: viewer.id },
        episode: { id: episode.id },
      })
      .orIgnore()
      .execute();

    // =========================================
    // RESPONSE
    // =========================================
    return {
      can_watch: true,
      is_resuming: isResuming,
      episode: {
        id: episode.id,
        drama_id: episode.dramaId,
        episode_number: episode.episodeNumber,
        title: episode.title,
        video_url: episode.videoUrl,
        thumbnail: episode.thumbnail,
        is_free: episode.coinCost === 0,
        coin_cost: episode.coinCost,
        duration_seconds: episode.durationSeconds,
      },
      watch_history: this.toWatchHistoryResponse(watchHistory),
    };
  }

  async upsertWatchHistory(
    episodeId: number,
    updateWatchHistoryDto: UpdateWatchHistoryDto,
  ) {
    const { deviceId, progressSeconds, completed } = updateWatchHistoryDto;

    if (!deviceId?.trim()) {
      throw new BadRequestException('deviceId is required');
    }

    await this.ensureEpisodeExists(episodeId);
    const viewer = await this.resolveViewer(undefined, deviceId, false);

    if (!viewer) {
      throw new BadRequestException(
        'No viewer found for the provided deviceId',
      );
    }

    const watchHistory = await this.watchHistoryRepository.findOne({
      where: {
        episode: { id: episodeId },
        user: { id: viewer.id },
      },
      relations: {
        episode: true,
        user: true,
      },
    });

    if (!watchHistory) {
      throw new ForbiddenException({
        message:
          'Episode playback has not been started. Call the play endpoint first.',
        reason: 'episode_not_started',
        can_watch: false,
      });
    }

    watchHistory.progressSeconds = progressSeconds ?? 0;
    watchHistory.completed = completed ?? watchHistory.completed;
    watchHistory.lastWatchedAt = new Date();

    const savedWatchHistory =
      await this.watchHistoryRepository.save(watchHistory);

    return this.toWatchHistoryResponse(savedWatchHistory);
  }

  private toDramaListItem(drama: Drama) {
    return {
      id: drama.id,
      title: drama.title,
      description: drama.description,
      thumbnail_url: drama.thumbnailUrl,
      is_exclusive: drama.isExclusive,
      total_episodes: drama.totalEpisodes,
      tag: drama.tag
        ? {
            id: drama.tag.id,
            slug: drama.tag.slug,
            name: drama.tag.name,
          }
        : null,
      genres: drama.dramaGenres.map((dramaGenre) => ({
        id: dramaGenre.genre.id,
        name: dramaGenre.genre.name,
      })),
      created_at: drama.createdAt,
      updated_at: drama.updatedAt,
    };
  }

  private async getEpisodeAccessMap(episodes: Episode[], userId?: number) {
    const episodeAccess = new Map<
      number,
      {
        canWatch?: boolean;
        isStarted?: boolean;
        isLockedByPlan?: boolean;
        progressSeconds?: number;
        completed?: boolean;
      }
    >();

    if (!userId) {
      return episodeAccess;
    }

    const watchHistory = await this.watchHistoryRepository.find({
      where: {
        user: { id: userId },
      },
      relations: {
        episode: true,
        user: true,
      },
    });

    const startedEpisodeIds = new Set(
      watchHistory.map((entry) => entry.episode.id),
    );
    const startedEpisodesCount = startedEpisodeIds.size;

    for (const episode of episodes) {
      const existingWatchHistory = watchHistory.find(
        (entry) => entry.episode.id === episode.id,
      );
      const isStarted = Boolean(existingWatchHistory);
      const canWatch =
        isStarted || startedEpisodesCount < this.getFreeEpisodeLimit();

      episodeAccess.set(episode.id, {
        canWatch,
        isStarted,
        isLockedByPlan: !canWatch,
        progressSeconds: existingWatchHistory?.progressSeconds ?? 0,
        completed: existingWatchHistory?.completed ?? false,
      });
    }

    return episodeAccess;
  }

  private async hasActiveSubscription(userId: number): Promise<boolean> {
    const now = Date.now();

    const activeSubscription = await this.userSubscriptionRepository
      .createQueryBuilder('subscription')
      .where('subscription.user_id = :userId', { userId })
      .andWhere('subscription.status = :status', {
        status: UserSubscriptionStatus.ACTIVE,
      })
      .andWhere('subscription.starts_at <= :now', { now })
      .andWhere('subscription.ends_at > :now', { now })
      .select('subscription.id')
      .getOne();

    return Boolean(activeSubscription);
  }

  private getFreeEpisodeLimit(): number {
    const configuredLimit = this.configService.get<number | string>(
      'FREE_EPISODE_LIMIT',
      3,
    );
    const parsedLimit =
      typeof configuredLimit === 'number'
        ? configuredLimit
        : Number.parseInt(configuredLimit, 10);

    return Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 3;
  }

  private getEpisodeUnlockCost(episode: Episode): number {
    return Number.isInteger(episode.coinCost) && episode.coinCost >= 0
      ? episode.coinCost
      : 20;
  }

  private async resolveViewer(
    userId?: number,
    deviceId?: string,
    createGuest = false,
  ) {
    if (Number.isInteger(userId) && userId && userId > 0) {
      return this.usersService.findById(userId);
    }

    if (deviceId?.trim()) {
      if (createGuest) {
        return this.usersService.findOrCreateGuestByDeviceId(deviceId);
      }

      return this.usersService.findByDeviceId(deviceId);
    }

    return null;
  }

  private toEpisodeResponse(
    episode: Episode,
    access?: {
      canWatch?: boolean;
      isStarted?: boolean;
      isLockedByPlan?: boolean;
      progressSeconds?: number;
      completed?: boolean;
    },
  ) {
    return {
      id: episode.id,
      drama_id: episode.dramaId,
      episode_number: episode.episodeNumber,
      title: episode.title,
      coin_cost: episode.coinCost,
      duration_seconds: episode.durationSeconds,
      video_url: episode.videoUrl,
      thumbnail: episode.thumbnail,
      can_watch: access?.canWatch ?? true,
      is_started: access?.isStarted ?? false,
      is_locked_by_plan: access?.isLockedByPlan ?? false,
      progress_seconds: access?.progressSeconds ?? 0,
      completed: access?.completed ?? false,
      created_at: episode.createdAt,
      updated_at: episode.updatedAt,
    };
  }

  private async ensureEpisodeExists(episodeId: number) {
    const episode = await this.episodeRepository.findOne({
      where: { id: episodeId },
    });

    if (!episode) {
      throw new NotFoundException(`Episode ${episodeId} not found`);
    }

    return episode;
  }

  private toWatchHistoryResponse(watchHistory: WatchHistory) {
    return {
      id: watchHistory.id,
      user_id: watchHistory.user.id,
      episode_id: watchHistory.episode.id,
      progress_seconds: watchHistory.progressSeconds,
      completed: watchHistory.completed,
      last_watched_at: watchHistory.lastWatchedAt,
      can_watch: true,
    };
  }
}
