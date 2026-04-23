import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class PlayEpisodeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unlockWithCoins?: boolean;
}
