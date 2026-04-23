import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { Auth } from '../../config/common/decorators/auth.decorator';
import { NotificationService } from './notification.service';
import { TestPushNotificationDto } from './dto/test-push-notification.dto';

@Controller('notifications')
@ApiTags('Notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('test-push')
  @Auth()
  @ApiBody({ type: TestPushNotificationDto })
  async testPushNotification(
    @Body() testPushNotificationDto: TestPushNotificationDto,
  ) {
    return this.notificationService.sendPushNotification(
      testPushNotificationDto.token,
      testPushNotificationDto.title,
      testPushNotificationDto.body,
    );
  }

  @Patch(':id')
  @Auth()
  async readNotification(@Param('id', ParseIntPipe) notificationId: number) {
    return this.notificationService.readNotification(notificationId);
  }
}
