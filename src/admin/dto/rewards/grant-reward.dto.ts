import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { RewardEntryType } from '../../../rewards/entities/reward-history.entity';

export class GrantRewardDto {
  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId!: number;

  @ApiProperty({
    example: 50,
    description: 'Use negative value to deduct coins',
  })
  @Type(() => Number)
  @IsInt()
  coinsDelta!: number;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ruleId?: number;

  @ApiPropertyOptional({
    enum: RewardEntryType,
    example: RewardEntryType.MANUAL,
  })
  @IsOptional()
  @IsEnum(RewardEntryType)
  entryType?: RewardEntryType;

  @ApiPropertyOptional({ example: 'manual', maxLength: 50, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  referenceType?: string;

  @ApiPropertyOptional({
    example: 'admin-adjust-001',
    maxLength: 100,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceId?: string;

  @ApiPropertyOptional({
    example: 'manual_grant:5:2026-04-07T12:00:00.000Z',
    description: 'If omitted, auto-generated',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  idempotencyKey?: string;
}
