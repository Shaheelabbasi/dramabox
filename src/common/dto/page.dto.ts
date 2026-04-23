import { IsArray } from 'class-validator';
import { PageMetaDto } from 'config/common/dto/page-meta.dto';

export class PageDto<T> {
  @IsArray()
  readonly data: T[];

  readonly meta: PageMetaDto;
  readonly message?: string;

  constructor(data: T[], meta: PageMetaDto) {
    this.data = data;
    this.meta = meta;

    if (this.data.length === 0) {
      this.message = 'No Data Available';
    }
  }
}
