import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAdWatchDto {
  @ApiPropertyOptional({ example: 'ad_watch_completed' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  eventType?: string;
}
