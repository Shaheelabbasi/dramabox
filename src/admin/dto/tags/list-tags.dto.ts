import { PageOptionsDto } from '../../../../config/common/dto/page-options.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Order } from '../../../../config/common/dto/page-options.dto';

export class ListTagsDto extends PageOptionsDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take: number = 10;

  @ApiPropertyOptional({
    enum: Order,
    example: Order.DESC,
    default: Order.DESC,
  })
  @IsOptional()
  @IsEnum(Order)
  order: Order = Order.DESC;
}
