import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsPositive } from 'class-validator';

export class UpsertUserFavoriteDto {
  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  dramaId: number;

  @ApiProperty({ example: 101 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  episodeId: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isFavorite: boolean;
}
