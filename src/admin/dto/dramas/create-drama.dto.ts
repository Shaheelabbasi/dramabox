import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  Min,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateDramaDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isExclusive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (!trimmed) {
        return undefined;
      }

      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return [trimmed];
        }
      }

      if (trimmed.includes(',')) {
        return trimmed
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      }

      return [trimmed];
    }

    return [value];
  })
  genreIds?: number[];

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : Number(value),
  )
  @IsInt()
  @Min(1)
  tagId?: number;
}
