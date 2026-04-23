import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class VerifyGoogleSubscriptionDto {
  @ApiProperty({
    example: 'abc123_purchase_token',
    description: 'Google Play purchase token received from the client',
  })
  @IsString()
  @IsNotEmpty() 
  purchaseToken: string;

  @ApiProperty({
    example: 'premium_monthly',
    description: 'Google Play product ID (subscription SKU)',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Registered user ID (if user is logged in)',
  })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({
    example: 'device-abc-123',
    description: 'Device ID for guest users',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
