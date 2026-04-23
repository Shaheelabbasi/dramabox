import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../config/common/decorators/roles.decorator';
import { UserRole } from '../../config/common/enums/roles.enum';
import { NotifyUserDto } from './dto/notify-user.dto';
import { ListAllUsersDto } from './dto/list-all-users.dto';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto';
import { UsersService } from './users.service';

@Controller('admin/users')
@Roles([UserRole.ADMIN])
@ApiTags('Admin Users')
@ApiBearerAuth()
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get user stats for admin' })
  getStats() {
    return this.usersService.getUserStats();
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated user list for admin' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: 'admin@dramabox.local',
    description: 'Search by user id, email, or device id',
  })
  @ApiQuery({
    name: 'hasActiveSubscription',
    required: false,
    type: Boolean,
    example: true,
    description:
      'Filter users by whether they currently have an active subscription',
  })
  getAllUsers(@Query() listAllUsersDto: ListAllUsersDto) {
    return this.usersService.getAllUsers(listAllUsersDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user detail for admin' })
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  findAdminUserById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findAdminUserById(id);
  }

  @Patch(':id/account-status')
  @ApiOperation({ summary: 'Update account status for a user' })
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  updateAccountStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAccountStatusDto: UpdateAccountStatusDto,
  ) {
    return this.usersService.updateAccountStatus(id, updateAccountStatusDto);
  }

  @Post(':id/notify')
  @ApiOperation({ summary: 'Send a notification to a user' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'User ID or device ID',
  })
  @ApiBody({ type: NotifyUserDto })
  sendNotificationToUser(
    @Param('id') id: string,
    @Body() notifyUserDto: NotifyUserDto,
  ) {
    return this.usersService.sendNotificationToUser(id, notifyUserDto);
  }
}
