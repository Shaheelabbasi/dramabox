import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTagDto } from './create-tag.dto';

export class UpdateTagDto extends PartialType(CreateTagDto) {
  @ApiPropertyOptional({
    description: 'Unique machine-friendly tag key',
    example: 'popular',
    maxLength: 50,
  })
  slug?: string;

  @ApiPropertyOptional({
    description: 'Display name of the tag',
    example: 'Popular',
    maxLength: 100,
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Whether this tag is active',
    example: true,
  })
  isActive?: boolean;
}
