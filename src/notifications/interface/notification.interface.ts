import { NotificationTrigger } from '../enums/notification-trigger.enum';
import { NotificationType } from '../enums/notification-type.enum';

export interface Notification {
  type?: NotificationType;
  trigger?: NotificationTrigger;
  resource_id: number;
  title: string;
  description: string;
  read?: boolean;
  userId: number;
  pushToken?: string;
}
