import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PageOptionsDto } from '../../../config/common/dto/page-options.dto';

export class ListDramaEpisodesDto extends PageOptionsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly userId?: number;

  @IsOptional()
  @IsString()
  readonly deviceId?: string;
}
