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

export class NotifyUserDto {
  @ApiProperty({ example: 'Important update' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'Your subscription has been updated.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ example: 123 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  resourceId?: number;
}
