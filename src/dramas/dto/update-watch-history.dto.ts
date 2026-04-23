import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateWatchHistoryDto {
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  progressSeconds?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  completed?: boolean;
}
