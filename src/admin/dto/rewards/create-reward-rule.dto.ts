import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateRewardRuleDto {
  @ApiProperty({ example: 'daily_login', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code!: string;

  @ApiProperty({ example: 'Daily Login Reward', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  coins!: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 86400, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cooldownSeconds?: number;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxPerDay?: number;
}
