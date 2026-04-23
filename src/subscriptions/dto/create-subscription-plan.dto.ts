import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { BillingCycle } from '../entities/subscription-plan.entity';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'Premium Monthly' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 9.99 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  @Matches(/^[A-Za-z]{3}$/)
  currency?: string;

  @ApiProperty({ example: 30 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays: number;

  @ApiPropertyOptional({
    enum: BillingCycle,
    example: BillingCycle.MONTHLY,
    default: BillingCycle.MONTHLY,
  })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(BillingCycle))
  billingCycle?: BillingCycle;

  @ApiPropertyOptional({
    example: 'Unlimited viewing for 30 days with premium content access.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
