import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class TestPushNotificationDto {
  @ApiProperty({ example: 'fcm_device_token_here' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'Test Notification' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'This is a push notification test.' })
  @IsString()
  @IsNotEmpty()
  body: string;
}
