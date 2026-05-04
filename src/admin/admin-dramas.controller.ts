import {
  Body,
  Controller,
  Get,
  UploadedFiles,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AdminDramasService } from './admin-dramas.service';
import { CreateDramaDto } from './dto/dramas/create-drama.dto';
import { CreateEpisodeDto } from './dto/episodes/create-episode.dto';
import { CreateGenreDto } from './dto/genres/create-genre.dto';
import { CreateTagDto } from './dto/tags/create-tag.dto';
import { UpdateDramaDto } from './dto/dramas/update-drama.dto';
import { UpdateEpisodeDto } from './dto/episodes/update-episode.dto';
import { UpdateGenreDto } from './dto/genres/update-genre.dto';
import { UpdateTagDto } from './dto/tags/update-tag.dto';
import { ListTagsDto } from './dto/tags/list-tags.dto';
import { AssetStorage } from 'config/storage/asset-storage';
import { Roles } from '../../config/common/decorators/roles.decorator';
import { UserRole } from '../../config/common/enums/roles.enum';
import {
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

type UploadFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  path?: string;
};

@Controller('admin')
@Roles([UserRole.ADMIN])
@ApiTags('Admin')
@ApiBearerAuth()
export class AdminDramasController {
  constructor(private readonly adminDramasService: AdminDramasService) {}

  @Post('genres')
  @ApiOperation({ summary: 'Create a genre' })
  @ApiBody({ type: CreateGenreDto })
  createGenre(@Body() createGenreDto: CreateGenreDto) {
    return this.adminDramasService.createGenre(createGenreDto);
  }

  @Patch('genres/:id')
  @ApiOperation({ summary: 'Update a genre' })
  @ApiParam({ name: 'id', type: Number, description: 'Genre ID' })
  @ApiBody({ type: UpdateGenreDto })
  updateGenre(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGenreDto: UpdateGenreDto,
  ) {
    return this.adminDramasService.updateGenre(id, updateGenreDto);
  }

  @Post('tags')
  @ApiOperation({ summary: 'Create a tag' })
  @ApiBody({ type: CreateTagDto })
  createTag(@Body() createTagDto: CreateTagDto) {
    return this.adminDramasService.createTag(createTagDto);
  }

  @Patch('tags/:id')
  @ApiOperation({ summary: 'Update a tag' })
  @ApiParam({ name: 'id', type: Number, description: 'Tag ID' })
  @ApiBody({ type: UpdateTagDto })
  updateTag(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTagDto: UpdateTagDto,
  ) {
    return this.adminDramasService.updateTag(id, updateTagDto);
  }

  @Get('tags')
  @ApiOperation({ summary: 'Get all tags (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  findAllTags(@Query() listTagsDto: ListTagsDto) {
    return this.adminDramasService.findAllTags(listTagsDto);
  }

  @Post('dramas')
  @ApiOperation({ summary: 'Create a drama (with optional thumbnail upload)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Broken Destiny' },
        description: {
          type: 'string',
          example: 'A revenge romance between two rival heirs',
        },
        isExclusive: { type: 'boolean', example: false },
        genreIds: {
          oneOf: [
            { type: 'string', example: '[1,2]' },
            { type: 'string', example: '1,2' },
          ],
        },
        tagId: { type: 'integer', example: 1 },
        thumbnail: { type: 'string', format: 'binary' },
      },
      required: ['title', 'description'],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'thumbnail' }], {
      storage: AssetStorage,
    }),
  )
  async createDrama(
    @Body() createDramaDto: CreateDramaDto,
    @UploadedFiles()
    files?: {
      thumbnail?: UploadFile[];
    },
  ) {
    return this.adminDramasService.createDramaWithUpload(
      createDramaDto,
      files?.thumbnail?.[0],
    );
  }

  @Patch('dramas/:id')
  @ApiOperation({ summary: 'Update a drama (with optional thumbnail upload)' })
  @ApiParam({ name: 'id', type: Number, description: 'Drama ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Broken Destiny - Updated' },
        description: {
          type: 'string',
          example: 'Updated description',
        },
        isExclusive: { type: 'boolean', example: true },
        genreIds: {
          oneOf: [
            { type: 'string', example: '[1,2,3]' },
            { type: 'string', example: '1,2,3' },
          ],
        },
        tagId: { type: 'integer', example: 2 },
        thumbnail: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'thumbnail', maxCount: 1 }], {
      storage: AssetStorage,
    }),
  )
  updateDrama(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDramaDto: UpdateDramaDto,
    @UploadedFiles()
    files?: {
      thumbnail?: UploadFile[];
    },
  ) {
    return this.adminDramasService.updateDramaWithUpload(
      id,
      updateDramaDto,
      files?.thumbnail?.[0],
    );
  }

  @Post('dramas/:id/episodes')
  @ApiOperation({
    summary:
      'Add an episode to a drama (with optional video and thumbnail upload)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Drama ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        episodeNumber: { type: 'integer', example: 1 },
        title: { type: 'string', example: 'Episode 1' },
        isFree: { type: 'boolean', example: false },
        coinCost: { type: 'integer', example: 0 },
        durationSeconds: {
          type: 'integer',
          example: 742,
          description: 'Episode duration in seconds',
        },
        videoUrl: {
          type: 'string',
          example: 'https://cdn.example.com/video.mp4',
        },
        thumbnail: {
          oneOf: [
            {
              type: 'string',
              example: 'https://cdn.example.com/episode-thumbnail.jpg',
            },
            { type: 'string', format: 'binary' },
          ],
        },
        video: { type: 'string', format: 'binary' },
      },
      required: ['episodeNumber', 'title', 'durationSeconds'],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'video', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 },
      ],
      {
        storage: AssetStorage,
        limits: {
          fileSize: 200 * 1024 * 1024, // 200MB (adjust as needed)
        },
      },
    ),
  )
  addEpisode(
    @Param('id', ParseIntPipe) id: number,
    @Body() createEpisodeDto: CreateEpisodeDto,
    @UploadedFiles()
    files?: {
      video?: UploadFile[];
      thumbnail?: UploadFile[];
    },
  ) {
    return this.adminDramasService.addEpisodeWithUpload(
      id,
      createEpisodeDto,
      files?.video?.[0],
      files?.thumbnail?.[0],
    );
  }

  @Patch('episodes/:id')
  @ApiOperation({
    summary: 'Update an episode (with optional video and thumbnail upload)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Episode ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        episodeNumber: { type: 'integer', example: 2 },
        title: { type: 'string', example: 'Episode 2 - Updated' },
        isFree: { type: 'boolean', example: true },
        coinCost: { type: 'integer', example: 0 },
        durationSeconds: {
          type: 'integer',
          example: 780,
          description: 'Episode duration in seconds',
        },
        videoUrl: {
          type: 'string',
          example: 'https://cdn.example.com/new-episode.mp4',
        },
        thumbnail: {
          oneOf: [
            {
              type: 'string',
              example: 'https://cdn.example.com/new-episode-thumbnail.jpg',
            },
            { type: 'string', format: 'binary' },
          ],
        },
        video: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'video', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 },
      ],
      {
        storage: AssetStorage,
      },
    ),
  )
  updateEpisode(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEpisodeDto: UpdateEpisodeDto,
    @UploadedFiles()
    files?: {
      video?: UploadFile[];
      thumbnail?: UploadFile[];
    },
  ) {
    return this.adminDramasService.updateEpisodeWithUpload(
      id,
      updateEpisodeDto,
      files?.video?.[0],
      files?.thumbnail?.[0],
    );
  }
}
