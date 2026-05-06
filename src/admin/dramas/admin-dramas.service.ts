import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CreateDramaDto } from '../dto/dramas/create-drama.dto';
import { CreateEpisodeDto } from '../dto/episodes/create-episode.dto';
import { CreateGenreDto } from '../dto/genres/create-genre.dto';
import { CreateTagDto } from '../dto/tags/create-tag.dto';
import { ListTagsDto } from '../dto/tags/list-tags.dto';
import { UpdateDramaDto } from '../dto/dramas/update-drama.dto';
import { UpdateEpisodeDto } from '../dto/episodes/update-episode.dto';
import { UpdateGenreDto } from '../dto/genres/update-genre.dto';
import { UpdateTagDto } from '../dto/tags/update-tag.dto';
import { DramaGenre } from '../../dramas/entities/drama-genre.entity';
import { Drama } from '../../dramas/entities/drama.entity';
import { Episode } from '../../dramas/entities/episode.entity';
import { Genre } from '../../dramas/entities/genre.entity';
import { Tag } from '../../dramas/entities/tag.entity';
import { MinioService } from '../../minio/minio.service';
import { NotificationService } from '../../notifications/notification.service';
import { PageDto } from '../../../config/common/dto/page.dto';
import { PageMetaDto } from '../../../config/common/dto/page-meta.dto';

type UploadFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  path?: string;
};

@Injectable()
export class AdminDramasService {
  constructor(
    @InjectRepository(Drama)
    private readonly dramaRepository: Repository<Drama>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
    @InjectRepository(Episode)
    private readonly episodeRepository: Repository<Episode>,
    @InjectRepository(DramaGenre)
    private readonly dramaGenreRepository: Repository<DramaGenre>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    private readonly minioService: MinioService,
    private readonly notificationService: NotificationService,
  ) {}

  async createDramaWithUpload(
    createDramaDto: CreateDramaDto,
    thumbnail?: UploadFile,
  ) {
    const payload = this.parseCreateDramaDto(createDramaDto);

    if (!thumbnail) {
      return this.createDrama(payload);
    }

    const thumbnailUrl =
      await this.minioService.uploadDramaThumbnail(thumbnail);
    return this.createDrama({ ...payload, thumbnailUrl });
  }

  async updateDramaWithUpload(
    dramaId: number,
    updateDramaDto: UpdateDramaDto,
    thumbnail?: UploadFile,
  ) {
    const payload: UpdateDramaDto & { thumbnailUrl?: string } =
      this.parseUpdateDramaDto(updateDramaDto);
    let uploadedThumbnailUrl: string | undefined;

    if (thumbnail) {
      uploadedThumbnailUrl =
        await this.minioService.uploadDramaThumbnail(thumbnail);
      payload.thumbnailUrl = uploadedThumbnailUrl;
    }

    try {
      return await this.updateDrama(dramaId, payload);
    } catch (error) {
      if (uploadedThumbnailUrl) {
        await this.minioService.deleteFileByUrl(uploadedThumbnailUrl);
      }
      throw error;
    }
  }

  async createGenre(createGenreDto: CreateGenreDto) {
    const name = createGenreDto.name?.trim();

    if (!name) {
      throw new BadRequestException('Genre name is required');
    }

    const existingGenre = await this.genreRepository.findOne({
      where: { name },
    });

    if (existingGenre) {
      throw new BadRequestException('Genre already exists');
    }

    const genre = await this.genreRepository.save(
      this.genreRepository.create({
        name,
      }),
    );

    return this.toGenreResponse(genre);
  }

  async updateGenre(genreId: number, updateGenreDto: UpdateGenreDto) {
    const genre = await this.genreRepository.findOne({
      where: { id: genreId },
    });

    if (!genre) {
      throw new NotFoundException(`Genre ${genreId} not found`);
    }

    if (updateGenreDto.name !== undefined) {
      const name = updateGenreDto.name?.trim();

      if (!name) {
        throw new BadRequestException('Genre name is required');
      }

      const existingGenre = await this.genreRepository.findOne({
        where: {
          name,
          id: Not(genreId),
        },
      });

      if (existingGenre) {
        throw new BadRequestException('Genre already exists');
      }

      genre.name = name;
    }

    const updatedGenre = await this.genreRepository.save(genre);
    return this.toGenreResponse(updatedGenre);
  }

  async createTag(createTagDto: CreateTagDto) {
    const slug = createTagDto.slug?.trim().toLowerCase();
    const name = createTagDto.name?.trim();

    if (!slug) {
      throw new BadRequestException('Tag slug is required');
    }

    if (!name) {
      throw new BadRequestException('Tag name is required');
    }

    const existingTag = await this.tagRepository.findOne({
      where: [{ slug }, { name }],
    });

    if (existingTag) {
      throw new BadRequestException('Tag already exists');
    }

    const tag = await this.tagRepository.save(
      this.tagRepository.create({
        slug,
        name,
        isActive: createTagDto.isActive ?? true,
      }),
    );

    return this.toTagResponse(tag);
  }

  async findAllTags(
    pageOptionsDto: ListTagsDto = new ListTagsDto(),
  ): Promise<PageDto<ReturnType<AdminDramasService['toTagResponse']>>> {
    const [tags, itemCount] = await this.tagRepository.findAndCount({
      order: {
        createdAt: pageOptionsDto.order,
      },
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
    });

    const data = tags.map((tag) => this.toTagResponse(tag));
    const meta = new PageMetaDto({ pageOptionsDto, itemCount });

    return new PageDto(data, meta);
  }

  async updateTag(tagId: number, updateTagDto: UpdateTagDto) {
    const tag = await this.tagRepository.findOne({
      where: { id: tagId },
    });

    if (!tag) {
      throw new NotFoundException(`Tag ${tagId} not found`);
    }

    if (updateTagDto.slug !== undefined) {
      const slug = updateTagDto.slug?.trim().toLowerCase();

      if (!slug) {
        throw new BadRequestException('Tag slug is required');
      }

      const existingTag = await this.tagRepository.findOne({
        where: {
          slug,
          id: Not(tagId),
        },
      });

      if (existingTag) {
        throw new BadRequestException('Tag already exists');
      }

      tag.slug = slug;
    }

    if (updateTagDto.name !== undefined) {
      const name = updateTagDto.name?.trim();

      if (!name) {
        throw new BadRequestException('Tag name is required');
      }

      const existingTag = await this.tagRepository.findOne({
        where: {
          name,
          id: Not(tagId),
        },
      });

      if (existingTag) {
        throw new BadRequestException('Tag already exists');
      }

      tag.name = name;
    }

    if (updateTagDto.isActive !== undefined) {
      tag.isActive = updateTagDto.isActive;
    }

    const updatedTag = await this.tagRepository.save(tag);
    return this.toTagResponse(updatedTag);
  }

  async createDrama(
    createDramaDto: CreateDramaDto & { thumbnailUrl?: string },
  ) {
    const title = createDramaDto.title?.trim();
    const description = createDramaDto.description?.trim();

    if (!title) {
      throw new BadRequestException('Drama title is required');
    }

    if (!description) {
      throw new BadRequestException('Drama description is required');
    }

    const tag = await this.resolveOptionalTag(createDramaDto.tagId);

    const dramaToCreate = this.dramaRepository.create({
      title,
      description,
      thumbnailUrl: createDramaDto.thumbnailUrl?.trim() || null,
      isExclusive: createDramaDto.isExclusive ?? false,
      totalEpisodes: 0,
      tagId: tag?.id ?? null,
    });
    const drama = await this.dramaRepository.save(dramaToCreate);

    const genres = await this.attachGenresToDrama(
      drama,
      createDramaDto.genreIds ?? [],
    );

    return {
      id: drama.id,
      title: drama.title,
      description: drama.description,
      thumbnail_url: drama.thumbnailUrl,
      is_exclusive: drama.isExclusive,
      total_episodes: drama.totalEpisodes,
      tag: tag ? this.toTagResponse(tag) : null,
      genres: genres.map((genre) => this.toGenreResponse(genre)),
      created_at: drama.createdAt,
      updated_at: drama.updatedAt,
    };
  }

  async updateDrama(
    dramaId: number,
    updateDramaDto: UpdateDramaDto & { thumbnailUrl?: string },
  ) {
    const drama = await this.dramaRepository.findOne({
      where: { id: dramaId },
      relations: {
        dramaGenres: {
          genre: true,
        },
        tag: true,
      },
    });

    if (!drama) {
      throw new NotFoundException(`Drama ${dramaId} not found`);
    }

    const previousThumbnailUrl = drama.thumbnailUrl;

    if (updateDramaDto.title !== undefined) {
      const title = updateDramaDto.title?.trim();
      if (!title) {
        throw new BadRequestException('Drama title is required');
      }
      drama.title = title;
    }

    if (updateDramaDto.description !== undefined) {
      const description = updateDramaDto.description?.trim();
      if (!description) {
        throw new BadRequestException('Drama description is required');
      }
      drama.description = description;
    }

    if (updateDramaDto.isExclusive !== undefined) {
      drama.isExclusive = updateDramaDto.isExclusive;
    }

    if (updateDramaDto.thumbnailUrl !== undefined) {
      drama.thumbnailUrl = updateDramaDto.thumbnailUrl?.trim() || null;
    }

    if (updateDramaDto.tagId !== undefined) {
      const tag = await this.resolveOptionalTag(updateDramaDto.tagId);
      drama.tagId = tag?.id ?? null;
      drama.tag = tag ?? null;
    }

    await this.dramaRepository.save(drama);

    const genres = await this.syncDramaGenres(drama, updateDramaDto.genreIds);

    if (
      updateDramaDto.thumbnailUrl &&
      previousThumbnailUrl &&
      previousThumbnailUrl !== updateDramaDto.thumbnailUrl
    ) {
      await this.minioService.deleteFileByUrl(previousThumbnailUrl);
    }

    return {
      id: drama.id,
      title: drama.title,
      description: drama.description,
      thumbnail_url: drama.thumbnailUrl,
      is_exclusive: drama.isExclusive,
      total_episodes: drama.totalEpisodes,
      tag: drama.tag ? this.toTagResponse(drama.tag) : null,
      genres: genres.map((genre) => this.toGenreResponse(genre)),
      created_at: drama.createdAt,
      updated_at: drama.updatedAt,
    };
  }

  async addEpisode(dramaId: number, createEpisodeDto: CreateEpisodeDto) {
    const drama = await this.dramaRepository.findOne({
      where: { id: dramaId },
    });

    if (!drama) {
      throw new NotFoundException(`Drama ${dramaId} not found`);
    }

    const title = createEpisodeDto.title?.trim();
    const videoUrl = createEpisodeDto.videoUrl?.trim();
    const thumbnail = createEpisodeDto.thumbnail?.trim() || null;

    if (
      !Number.isInteger(createEpisodeDto.episodeNumber) ||
      createEpisodeDto.episodeNumber <= 0
    ) {
      throw new BadRequestException('episodeNumber must be a positive integer');
    }

    if (!title) {
      throw new BadRequestException('Episode title is required');
    }

    if (!videoUrl) {
      throw new BadRequestException('videoUrl is required');
    }

    if (
      !Number.isInteger(createEpisodeDto.durationSeconds) ||
      createEpisodeDto.durationSeconds <= 0
    ) {
      throw new BadRequestException(
        'durationSeconds must be a positive integer',
      );
    }

    const existingEpisode = await this.episodeRepository.findOne({
      where: {
        dramaId,
        episodeNumber: createEpisodeDto.episodeNumber,
      },
    });

    if (existingEpisode) {
      throw new BadRequestException(
        'Episode number already exists for this drama',
      );
    }

    const episode = await this.episodeRepository.save(
      this.episodeRepository.create({
        drama,
        dramaId: drama.id,
        episodeNumber: createEpisodeDto.episodeNumber,
        title,
        durationSeconds: createEpisodeDto.durationSeconds,
        videoUrl,
        thumbnail,
      }),
    );

    drama.totalEpisodes = await this.episodeRepository.count({
      where: { dramaId: drama.id },
    });
    await this.dramaRepository.save(drama);

    await this.notificationService.broadcastNewEpisodeNotification({
      dramaId: drama.id,
      dramaTitle: drama.title,
      episodeId: episode.id,
      episodeNumber: episode.episodeNumber,
      episodeTitle: episode.title,
    });

    return {
      id: episode.id,
      drama_id: episode.dramaId,
      episode_number: episode.episodeNumber,
      title: episode.title,
      is_free: episode.coinCost === 0,
      coin_cost: episode.coinCost,
      duration_seconds: episode.durationSeconds,
      video_url: episode.videoUrl,
      thumbnail: episode.thumbnail,
      created_at: episode.createdAt,
      updated_at: episode.updatedAt,
    };
  }

  async addEpisodeWithUpload(
    dramaId: number,
    createEpisodeDto: CreateEpisodeDto,
    video?: UploadFile,
    thumbnail?: UploadFile,
  ) {
    const payload = this.parseCreateEpisodeDto(createEpisodeDto);
    let uploadedVideoUrl: string | undefined;
    let uploadedThumbnailUrl: string | undefined;

    if (video) {
      await this.ensureEpisodeSlotAvailable(dramaId, payload.episodeNumber);
    }

    if (!payload.videoUrl) {
      if (!video) {
        throw new BadRequestException(
          'Episode video file or videoUrl is required',
        );
      }

      uploadedVideoUrl = await this.minioService.uploadDramaVideo(video);
      payload.videoUrl = uploadedVideoUrl;
    }

    if (!payload.thumbnail && thumbnail) {
      uploadedThumbnailUrl =
        await this.minioService.uploadEpisodeThumbnail(thumbnail);
      payload.thumbnail = uploadedThumbnailUrl;
    }

    try {
      return await this.addEpisode(dramaId, payload);
    } catch (error) {
      if (uploadedVideoUrl) {
        await this.minioService.deleteFileByUrl(uploadedVideoUrl);
      }
      if (uploadedThumbnailUrl) {
        await this.minioService.deleteFileByUrl(uploadedThumbnailUrl);
      }
      throw error;
    }
  }

  async updateEpisodeWithUpload(
    episodeId: number,
    updateEpisodeDto: UpdateEpisodeDto,
    video?: UploadFile,
    thumbnail?: UploadFile,
  ) {
    const payload = this.parseUpdateEpisodeDto(updateEpisodeDto);
    const existingEpisode = await this.getEpisodeById(episodeId);
    const previousVideoUrl = existingEpisode.videoUrl;
    const previousThumbnailUrl = existingEpisode.thumbnail;
    let uploadedVideoUrl: string | undefined;
    let uploadedThumbnailUrl: string | undefined;

    if (!payload.videoUrl && video) {
      uploadedVideoUrl = await this.minioService.uploadDramaVideo(video);
      payload.videoUrl = uploadedVideoUrl;
    }

    if (!payload.thumbnail && thumbnail) {
      uploadedThumbnailUrl =
        await this.minioService.uploadEpisodeThumbnail(thumbnail);
      payload.thumbnail = uploadedThumbnailUrl;
    }

    try {
      const updatedEpisode = await this.updateEpisode(episodeId, payload);

      if (
        uploadedVideoUrl &&
        previousVideoUrl &&
        previousVideoUrl !== uploadedVideoUrl
      ) {
        await this.minioService.deleteFileByUrl(previousVideoUrl);
      }

      if (
        uploadedThumbnailUrl &&
        previousThumbnailUrl &&
        previousThumbnailUrl !== uploadedThumbnailUrl
      ) {
        await this.minioService.deleteFileByUrl(previousThumbnailUrl);
      }

      return updatedEpisode;
    } catch (error) {
      if (uploadedVideoUrl) {
        await this.minioService.deleteFileByUrl(uploadedVideoUrl);
      }
      if (uploadedThumbnailUrl) {
        await this.minioService.deleteFileByUrl(uploadedThumbnailUrl);
      }
      throw error;
    }
  }

  async updateEpisode(episodeId: number, updateEpisodeDto: UpdateEpisodeDto) {
    const episode = await this.getEpisodeById(episodeId);

    if (updateEpisodeDto.episodeNumber !== undefined) {
      if (
        !Number.isInteger(updateEpisodeDto.episodeNumber) ||
        updateEpisodeDto.episodeNumber <= 0
      ) {
        throw new BadRequestException(
          'episodeNumber must be a positive integer',
        );
      }

      await this.ensureEpisodeSlotAvailableForUpdate(
        episode.dramaId,
        updateEpisodeDto.episodeNumber,
        episode.id,
      );
      episode.episodeNumber = updateEpisodeDto.episodeNumber;
    }

    if (updateEpisodeDto.title !== undefined) {
      const title = updateEpisodeDto.title?.trim();
      if (!title) {
        throw new BadRequestException('Episode title is required');
      }
      episode.title = title;
    }

    if (updateEpisodeDto.durationSeconds !== undefined) {
      if (
        !Number.isInteger(updateEpisodeDto.durationSeconds) ||
        updateEpisodeDto.durationSeconds <= 0
      ) {
        throw new BadRequestException(
          'durationSeconds must be a positive integer',
        );
      }
      episode.durationSeconds = updateEpisodeDto.durationSeconds;
    }

    if (updateEpisodeDto.isFree === true) {
      episode.coinCost = 0;
    }

    if (updateEpisodeDto.videoUrl !== undefined) {
      const videoUrl = updateEpisodeDto.videoUrl?.trim();
      if (!videoUrl) {
        throw new BadRequestException('videoUrl is required');
      }
      episode.videoUrl = videoUrl;
    }

    if (updateEpisodeDto.thumbnail !== undefined) {
      episode.thumbnail = updateEpisodeDto.thumbnail?.trim() || null;
    }

    const savedEpisode = await this.episodeRepository.save(episode);

    return {
      id: savedEpisode.id,
      drama_id: savedEpisode.dramaId,
      episode_number: savedEpisode.episodeNumber,
      title: savedEpisode.title,
      is_free: savedEpisode.coinCost === 0,
      coin_cost: savedEpisode.coinCost,
      duration_seconds: savedEpisode.durationSeconds,
      video_url: savedEpisode.videoUrl,
      thumbnail: savedEpisode.thumbnail,
      created_at: savedEpisode.createdAt,
      updated_at: savedEpisode.updatedAt,
    };
  }

  private async ensureEpisodeSlotAvailable(
    dramaId: number,
    episodeNumber: number,
  ) {
    const drama = await this.dramaRepository.findOne({
      where: { id: dramaId },
    });

    if (!drama) {
      throw new NotFoundException(`Drama ${dramaId} not found`);
    }

    const existingEpisode = await this.episodeRepository.findOne({
      where: {
        dramaId,
        episodeNumber,
      },
    });

    if (existingEpisode) {
      throw new BadRequestException(
        'Episode number already exists for this drama',
      );
    }
  }

  private async ensureEpisodeSlotAvailableForUpdate(
    dramaId: number,
    episodeNumber: number,
    episodeId: number,
  ) {
    const existingEpisode = await this.episodeRepository.findOne({
      where: {
        dramaId,
        episodeNumber,
        id: Not(episodeId),
      },
    });

    if (existingEpisode) {
      throw new BadRequestException(
        'Episode number already exists for this drama',
      );
    }
  }

  private parseCreateDramaDto(createDramaDto: CreateDramaDto): CreateDramaDto {
    return {
      ...createDramaDto,
      isExclusive: this.parseOptionalBoolean(createDramaDto.isExclusive),
      genreIds: this.parseOptionalNumberArray(createDramaDto.genreIds),
      tagId: this.parseOptionalInt(createDramaDto.tagId, 'tagId'),
    };
  }

  private parseCreateEpisodeDto(
    createEpisodeDto: CreateEpisodeDto,
  ): CreateEpisodeDto {
    return {
      ...createEpisodeDto,
      episodeNumber: this.parseRequiredInt(
        createEpisodeDto.episodeNumber,
        'episodeNumber',
      ),
      durationSeconds: this.parseRequiredInt(
        createEpisodeDto.durationSeconds,
        'durationSeconds',
      ),
      isFree: this.parseOptionalBoolean(createEpisodeDto.isFree),
    };
  }

  private parseUpdateEpisodeDto(
    updateEpisodeDto: UpdateEpisodeDto,
  ): UpdateEpisodeDto {
    return {
      ...updateEpisodeDto,
      episodeNumber: this.parseOptionalInt(
        updateEpisodeDto.episodeNumber,
        'episodeNumber',
      ),
      durationSeconds: this.parseOptionalInt(
        updateEpisodeDto.durationSeconds,
        'durationSeconds',
      ),
      isFree: this.parseOptionalBoolean(updateEpisodeDto.isFree),
    };
  }

  private parseUpdateDramaDto(updateDramaDto: UpdateDramaDto): UpdateDramaDto {
    return {
      ...updateDramaDto,
      isExclusive: this.parseOptionalBoolean(updateDramaDto.isExclusive),
      genreIds: this.parseOptionalNumberArray(updateDramaDto.genreIds),
      tagId: this.parseOptionalInt(updateDramaDto.tagId, 'tagId'),
    };
  }

  private parseOptionalBoolean(value?: boolean | string) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    throw new BadRequestException(`Invalid boolean value: ${value}`);
  }

  private parseOptionalInt(
    value: number | string | undefined,
    fieldName: string,
  ) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (typeof value === 'number') {
      return value;
    }

    const parsedValue = Number.parseInt(value, 10);

    if (Number.isNaN(parsedValue)) {
      throw new BadRequestException(`${fieldName} must be an integer`);
    }

    return parsedValue;
  }

  private parseRequiredInt(value: number | string, fieldName: string) {
    if (typeof value === 'number') {
      return value;
    }

    const parsedValue = Number.parseInt(value, 10);

    if (Number.isNaN(parsedValue)) {
      throw new BadRequestException(`${fieldName} must be an integer`);
    }

    return parsedValue;
  }

  private parseOptionalNumberArray(value?: number[] | string) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value.map((item) =>
        typeof item === 'number' ? item : Number.parseInt(String(item), 10),
      );
    }

    try {
      const parsedValue = JSON.parse(value);

      if (!Array.isArray(parsedValue)) {
        throw new Error('Not an array');
      }

      return parsedValue.map((item) => Number.parseInt(String(item), 10));
    } catch {
      throw new BadRequestException(
        'genreIds must be a JSON array of integers',
      );
    }
  }

  private async attachGenresToDrama(drama: Drama, genreIds: number[]) {
    if (!genreIds.length) {
      return [];
    }

    const uniqueGenreIds = [...new Set(genreIds)];
    const genres = await this.genreRepository.find({
      where: uniqueGenreIds.map((id) => ({ id })),
    });

    if (genres.length !== uniqueGenreIds.length) {
      throw new NotFoundException('One or more genres were not found');
    }

    await this.dramaGenreRepository.save(
      genres.map((genre) =>
        this.dramaGenreRepository.create({
          drama,
          genre,
        }),
      ),
    );

    return genres;
  }

  private async getEpisodeById(episodeId: number) {
    const episode = await this.episodeRepository.findOne({
      where: { id: episodeId },
    });

    if (!episode) {
      throw new NotFoundException(`Episode ${episodeId} not found`);
    }

    return episode;
  }

  private async resolveOptionalTag(tagId?: number) {
    if (tagId === undefined || tagId === null) {
      return undefined;
    }

    const tag = await this.tagRepository.findOne({
      where: { id: tagId },
    });

    if (!tag) {
      throw new NotFoundException(`Tag ${tagId} not found`);
    }

    if (!tag.isActive) {
      throw new BadRequestException(`Tag ${tagId} is inactive`);
    }

    return tag;
  }

  private async syncDramaGenres(drama: Drama, genreIds?: number[]) {
    if (genreIds === undefined) {
      return (drama.dramaGenres ?? []).map((item) => item.genre);
    }

    await this.dramaGenreRepository
      .createQueryBuilder()
      .delete()
      .from(DramaGenre)
      .where('drama_id = :dramaId', { dramaId: drama.id })
      .execute();

    if (!genreIds.length) {
      return [];
    }

    return this.attachGenresToDrama(drama, genreIds);
  }

  private toGenreResponse(genre: Genre) {
    return {
      id: genre.id,
      name: genre.name,
      created_at: genre.createdAt,
      updated_at: genre.updatedAt,
    };
  }

  private toTagResponse(tag: Tag) {
    return {
      id: tag.id,
      slug: tag.slug,
      name: tag.name,
      is_active: tag.isActive,
      created_at: tag.createdAt,
      updated_at: tag.updatedAt,
    };
  }
}
