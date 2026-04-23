import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { AdminNotificationsController } from './admin-notifications.controller';
import { Notifications } from './entities/notification.entity';
import { FirebaseService } from './firebase/firebase.service';
import { NotificationsController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notifications, User])],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationService, FirebaseService],
  exports: [NotificationService],
})
export class NotificationsModule {}
