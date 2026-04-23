import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateEpisodeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  episodeNumber!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  isFree?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationSeconds!: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : String(value).trim(),
  )
  @IsString()
  @IsUrl({ require_tld: false })
  videoUrl?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : String(value).trim(),
  )
  @IsString()
  @IsUrl({ require_tld: false })
  thumbnail?: string;
}
