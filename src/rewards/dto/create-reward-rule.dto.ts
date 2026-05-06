import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRewardRuleDto {
  @ApiProperty({ example: 'daily_login' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Daily Login Reward' })
  @IsString()
  name: string;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  coins: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cooldownSeconds?: number | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPerDay?: number | null;
}
