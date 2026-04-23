import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class TopUpBalanceDto {
  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId!: number;

  @ApiProperty({
    example: 100,
    description: 'Amount of coins to add to the user balance',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({
    example: 'admin_topup_001',
    maxLength: 100,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceId?: string;

  @ApiPropertyOptional({
    example: 'topup:5:2026-04-14T12:00:00.000Z',
    description: 'If omitted, auto-generated',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  idempotencyKey?: string;
}
