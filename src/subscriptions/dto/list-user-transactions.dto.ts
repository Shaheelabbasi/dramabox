import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PageOptionsDto } from '../../../config/common/dto/page-options.dto';

export class ListUserTransactionsDto extends PageOptionsDto {
  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @ApiPropertyOptional({ example: 'device-abc-123' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceId?: string;
}
