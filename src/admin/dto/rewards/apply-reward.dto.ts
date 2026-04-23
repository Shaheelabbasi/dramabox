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

export class ApplyRewardDto {
  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId!: number;

  @ApiProperty({ example: 'daily_login' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ruleCode!: string;

  @ApiPropertyOptional({
    enum: RewardEntryType,
    example: RewardEntryType.REWARD,
  })
  @IsOptional()
  @IsEnum(RewardEntryType)
  entryType?: RewardEntryType;

  @ApiPropertyOptional({ example: 'login', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  referenceType?: string;

  @ApiPropertyOptional({ example: '2026-04-07', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceId?: string;

  @ApiProperty({ example: 'daily_login:5:2026-04-07' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  idempotencyKey!: string;
}
