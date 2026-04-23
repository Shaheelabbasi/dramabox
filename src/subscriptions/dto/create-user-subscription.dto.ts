import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateUserSubscriptionDto {
  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @ApiPropertyOptional({ example: 'device-abc-123' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  deviceId?: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  planId: number;

  @ApiProperty({ example: 'stripe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  provider: string;

  @ApiProperty({ example: 'txn_12345' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  providerTxnId: string;

  @ApiPropertyOptional({ example: 'sub_12345' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  providerSubscriptionId?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  autoRenew?: boolean;

  @ApiPropertyOptional({ example: 9.99 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({
    example: { event: 'checkout.session.completed' },
    type: Object,
  })
  @IsOptional()
  @IsObject()
  rawPayload?: Record<string, unknown>;
}
