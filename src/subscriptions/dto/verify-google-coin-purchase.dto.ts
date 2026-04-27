import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class VerifyGoogleCoinPurchaseDto {
  @ApiProperty({
    example: 'coin_pack_100',
    description: 'Google Play in-app product ID for coins',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    example: 'abc123_purchase_token',
    description: 'Google Play purchase token received from client',
  })
  @IsString()
  @IsNotEmpty()
  purchaseToken: string;

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
