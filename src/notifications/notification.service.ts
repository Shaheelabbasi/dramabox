import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { PageMetaDto } from '../../config/common/dto/page-meta.dto';
import { PageOptionsDto } from '../../config/common/dto/page-options.dto';
import { PageDto } from '../../config/common/dto/page.dto';
import { User } from '../users/entities/user.entity';
import { NotificationAudience } from './enums/notification-audience.enum';
import { NotificationTrigger } from './enums/notification-trigger.enum';
import { NotificationType } from './enums/notification-type.enum';
import { FirebaseService } from './firebase/firebase.service';
import { Notifications } from './entities/notification.entity';
import { Notification } from './interface/notification.interface';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notifications)
    private readonly notificationsRepo: Repository<Notifications>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly firebaseService: FirebaseService,
  ) {}

  async createNotification(data: Notification): Promise<Notifications> {
    const notification = this.notificationsRepo.create({
      type: data.type ?? null,
      trigger: data.trigger ?? NotificationTrigger.AUTO,
      resource_id: data.resource_id,
      title: data.title,
      description: data.description,
      read: data.read ?? false,
      recipientCount: 1,
      user: { id: data.userId },
    });

    const savedNotification = await this.notificationsRepo.save(notification);

    const pushToken =
      data.pushToken?.trim() ||
      (
        await this.usersRepo.findOne({
          where: { id: data.userId },
          select: ['id', 'firebaseToken'],
        })
      )?.firebaseToken ||
      '';
    if (pushToken) {
      await this.firebaseService.sendNotification(
        pushToken,
        data.title,
        data.description,
      );
    }

    return savedNotification;
  }

  async sendPushNotification(token: string, title: string, body: string) {
    return  this.firebaseService.sendNotification(token, title, body);
  }

  async broadcastNewEpisodeNotification(data: {
    dramaId: number;
    dramaTitle: string;
    episodeId: number;
    episodeNumber: number;
    episodeTitle: string;
  }) {
    const title = 'New Episode!';
    const description = `Episode ${data.episodeNumber} is now live`;

    const users = await this.usersRepo.find({
      where: {
        role: Not('admin'),
      },
      select: ['id', 'firebaseToken'],
    });

    if (!users.length) {
      return {
        title,
        description,
        recipients: 0,
        saved: 0,
        sent: 0,
      };
    }

    const notification = this.notificationsRepo.create({
      type: NotificationType.NEW_EPISODE,
      trigger: NotificationTrigger.ADMIN,
      audience: NotificationAudience.ALL_USERS,
      resource_id: data.episodeId,
      title,
      description,
      read: false,
      recipientCount: users.length,
    });

    const savedNotification = await this.notificationsRepo.save(notification);

    const pushTokens = users
      .map((user) =>
        user.firebaseToken?.trim() && user?.notificationsEnabled
          ? user.firebaseToken
          : '',
      )
      .filter(
        (token, index, tokens) => token && tokens.indexOf(token) === index,
      );

    if (!pushTokens.length) {
      return {
        title,
        description,
        recipients: users.length,
        saved: savedNotification ? 1 : 0,
        sent: 0,
      };
    }

    const results = await Promise.all(
      pushTokens.map((token) =>
        this.firebaseService.sendNotificationWithData(token, {
          notification: {
            title,
            body: description,
          },
          data: {
            screen: 'drama',
            dramaId: String(data.dramaId),
          },
        }),
      ),
    );

    return {
      title,
      description,
      recipients: users.length,
      saved: savedNotification ? 1 : 0,
      sent: results.filter((result) => result.success).length,
    };
  }

  async getNotificationById(id: number): Promise<Notifications> {
    const notification = await this.notificationsRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    return notification;
  }

  async removeNotification(id: number) {
    const result = await this.notificationsRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Notification not found');
    }
    return { message: 'Notification deleted successfully' };
  }

  async readNotification(notificationId: number) {
    const readNotification = await this.notificationsRepo.update(
      { id: notificationId },
      { read: true },
    );

    if (readNotification.affected === 1) {
      return { message: 'Notification read successfully' };
    }

    throw new BadRequestException('Notification not found');
  }

  async getNotificationsForUser(
    userId: number,
    pageOptionsDto: PageOptionsDto,
  ) {
    const [notifications, itemCount] = await this.notificationsRepo
      .createQueryBuilder('notification')
      .leftJoin('notification.user', 'user')
      .where('user.id = :id', { id: userId })
      .take(pageOptionsDto.take)
      .skip(pageOptionsDto.skip)
      .orderBy('notification.id', 'DESC')
      .getManyAndCount();

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(notifications, pageMetaDto);
  }

  async getAllNotifications(pageOptionsDto: PageOptionsDto) {
    const [notifications, itemCount] = await this.notificationsRepo
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.user', 'user')
      .select([
        'notification.id',
        'notification.type',
        'notification.trigger',
        'notification.resource_id',
        'notification.title',
        'notification.description',
        'notification.read',
        'notification.recipientCount',
        'notification.createdAt',
        'notification.updatedAt',
        'user.id',
        'user.email',
        'user.deviceId',
        'user.role',
      ])
      .take(pageOptionsDto.take)
      .skip(pageOptionsDto.skip)
      .orderBy('notification.id', pageOptionsDto.order)
      .getManyAndCount();

    const data = notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      trigger: notification.trigger,
      resource_id: notification.resource_id,
      title: notification.title,
      description: notification.description,
      read: notification.read,
      recipient_count: notification.recipientCount,
      created_at: notification.createdAt,
      updated_at: notification.updatedAt,
      user: notification.user
        ? {
            id: notification.user.id,
            email: notification.user.email,
            device_id: notification.user.deviceId,
            role: notification.user.role,
          }
        : null,
    }));

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(data, pageMetaDto);
  }
}
