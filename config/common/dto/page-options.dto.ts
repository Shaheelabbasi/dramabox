import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export enum Order {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class PageOptionsDto {
  @IsEnum(Order)
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  readonly order: Order = Order.DESC;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly take: number = 10;

  get skip(): number {
    return (this.page - 1) * this.take;
  }
}
