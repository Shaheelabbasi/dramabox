import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PageOptionsDto } from '../../config/common/dto/page-options.dto';
import { UsersService } from './users.service';
import { CheckInDto } from './dto/check-in.dto';
import { ListUserWatchHistoryDto } from './dto/list-user-watch-history.dto';
import { UpdateFirebaseTokenDto } from './dto/update-firebase-token.dto';
import { UpdateUserDetailsDto } from './dto/update-user-details.dto';
import { UpsertUserFavoriteDto } from './dto/upsert-user-favorite.dto';
import { ListUserFavoritesDto } from './dto/list-user-favorites.dto';
import { CreateAdWatchDto } from './dto/create-ad-watch.dto';

@Controller('users')
@ApiTags('Users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register-token')
  @ApiOperation({ summary: 'Update Firebase token for a user' })
  @ApiBody({ type: UpdateFirebaseTokenDto })
  async updateFirebaseToken(
    @Body() updateFirebaseTokenDto: UpdateFirebaseTokenDto,
  ) {
    return this.usersService.updateFirebaseToken(updateFirebaseTokenDto);
  }

  @Post('check-in')
  @ApiOperation({ summary: 'Check in for daily rewards' })
  @ApiBody({ type: CheckInDto })
  async checkIn(@Body() checkInDto: CheckInDto) {
    return this.usersService.checkIn(checkInDto);
  }

  @Get('check-in/status')
  @ApiOperation({ summary: 'Get daily check-in status' })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'deviceId', required: false, type: String })
  async getCheckInStatus(@Query() checkInDto: CheckInDto) {
    return this.usersService.getCheckInStatus(checkInDto);
  }

  @Get('streak')
  @ApiOperation({ summary: 'Get user streak details' })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'deviceId', required: false, type: String })
  async getUserStreak(@Query() checkInDto: CheckInDto) {
    return this.usersService.getUserStreakByIdentifiers(checkInDto);
  }

  @ApiOperation({ summary: 'Get user watch history (paginated)' })
  @ApiParam({
    name: 'userIdOrDeviceId',
    description: 'User ID or device ID',
    example: '5',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @Get(':userIdOrDeviceId/watch-history')
  async getWatchHistory(
    @Param('userIdOrDeviceId') userIdOrDeviceId: string,
    @Query() listUserWatchHistoryDto: ListUserWatchHistoryDto,
  ) {
    return this.usersService.findUserWatchHistory(
      userIdOrDeviceId,
      listUserWatchHistoryDto,
    );
  }

  @ApiOperation({ summary: 'Get user transaction history (paginated)' })
  @ApiParam({
    name: 'userIdOrDeviceId',
    description: 'User ID or device ID',
    example: '5',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @Get(':userIdOrDeviceId/transactions')
  async getTransactionHistory(
    @Param('userIdOrDeviceId') userIdOrDeviceId: string,
    @Query() pageOptionsDto: PageOptionsDto,
  ) {
    return this.usersService.getUserTransactionHistory(
      userIdOrDeviceId,
      pageOptionsDto,
    );
  }

  @ApiOperation({ summary: 'Get user reward history (paginated)' })
  @ApiParam({
    name: 'userIdOrDeviceId',
    description: 'User ID or device ID',
    example: '5',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @Get(':userIdOrDeviceId/reward-history')
  async getRewardHistory(
    @Param('userIdOrDeviceId') userIdOrDeviceId: string,
    @Query() pageOptionsDto: PageOptionsDto,
  ) {
    return this.usersService.getUserRewardHistory(
      userIdOrDeviceId,
      pageOptionsDto,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID or device ID' })
  async findOne(@Param('id') id: any) {
    return this.usersService.findByIdOrDeviceIdWithSubscriptionFlag(String(id));
  }

  @ApiOperation({ summary: 'Get user favorites (paginated)' })
  @ApiParam({
    name: 'userIdOrDeviceId',
    description: 'User ID or device ID',
    example: '5',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @Get(':userIdOrDeviceId/favourites')
  async getFavourites(
    @Param('userIdOrDeviceId') userIdOrDeviceId: string,
    @Query() listUserFavoritesDto: ListUserFavoritesDto,
  ) {
    return this.usersService.getUserFavorites(
      userIdOrDeviceId,
      listUserFavoritesDto,
    );
  }

  @ApiOperation({ summary: 'Add or update user favorite drama/episode' })
  @ApiParam({
    name: 'userIdOrDeviceId',
    description: 'User ID or device ID',
    example: '5',
  })
  @ApiBody({ type: UpsertUserFavoriteDto })
  @Patch(':userIdOrDeviceId/favourites')
  async upsertFavourite(
    @Param('userIdOrDeviceId') userIdOrDeviceId: string,
    @Body() upsertUserFavoriteDto: UpsertUserFavoriteDto,
  ) {
    return this.usersService.upsertUserFavorite(
      userIdOrDeviceId,
      upsertUserFavoriteDto,
    );
  }

  @ApiOperation({ summary: 'Create ad watch entry for a user' })
  @ApiParam({
    name: 'userIdOrDeviceId',
    description: 'User ID or device ID',
    example: '5',
  })
  @ApiBody({ type: CreateAdWatchDto, required: false })
  @Post(':userIdOrDeviceId/ad-watches')
  async createAdWatch(
    @Param('userIdOrDeviceId') userIdOrDeviceId: string,
    @Body() createAdWatchDto: CreateAdWatchDto,
  ) {
    return this.usersService.createAdWatch(userIdOrDeviceId, createAdWatchDto);
  }

  @Patch(':userIdOrDeviceId')
  @ApiOperation({ summary: 'Update user details by user ID or device ID' })
  @ApiParam({ name: 'userIdOrDeviceId', description: 'User ID or device ID' })
  @ApiBody({ type: UpdateUserDetailsDto })
  async updateUserDetails(
    @Param('userIdOrDeviceId') userIdOrDeviceId: string,
    @Body() updateUserDetailsDto: UpdateUserDetailsDto,
  ) {
    return this.usersService.updateUserDetails(
      userIdOrDeviceId,
      updateUserDetailsDto,
    );
  }
}
