import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PageOptionsDto } from '../../../config/common/dto/page-options.dto';

export class ListAllUsersDto extends PageOptionsDto {
  @IsOptional()
  @IsString()
  readonly search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalizedValue = value.trim().toLowerCase();

      if (normalizedValue === 'true') {
        return true;
      }

      if (normalizedValue === 'false') {
        return false;
      }
    }

    return value;
  })
  @IsBoolean()
  readonly hasActiveSubscription?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly userId?: number;
}
