import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PageOptionsDto } from '../../../config/common/dto/page-options.dto';

export class ListDramasDto extends PageOptionsDto {
  @IsOptional()
  @IsString()
  readonly deviceId?: string;

  @IsOptional()
  @IsString()
  readonly search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly tagId?: number;

  @IsOptional()
  @IsString()
  readonly tag?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly genreId?: number;

  @IsOptional()
  @IsString()
  readonly genre?: string;
}
