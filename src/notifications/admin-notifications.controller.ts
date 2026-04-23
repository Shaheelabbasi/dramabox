import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../config/common/decorators/roles.decorator';
import { UserRole } from '../../config/common/enums/roles.enum';
import { PageOptionsDto } from '../../config/common/dto/page-options.dto';
import { NotificationService } from './notification.service';

@Controller('admin/notifications')
@Roles([UserRole.ADMIN])
@ApiTags('Admin Notifications')
@ApiBearerAuth()
export class AdminNotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for admin' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  getAllNotifications(@Query() pageOptionsDto: PageOptionsDto) {
    return this.notificationService.getAllNotifications(pageOptionsDto);
  }
}
