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
import { UsersService } from './users.service';
import { CheckInDto } from './dto/check-in.dto';
import { ListUserWatchHistoryDto } from './dto/list-user-watch-history.dto';
import { UpdateFirebaseTokenDto } from './dto/update-firebase-token.dto';
import { UpdateUserDetailsDto } from './dto/update-user-details.dto';

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

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID or device ID' })
  async findOne(@Param('id') id: any) {
    return this.usersService.findByIdOrDeviceId(String(id));
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
