import { PartialType } from '@nestjs/mapped-types';
import { CreateDramaDto } from './create-drama.dto';

export class UpdateDramaDto extends PartialType(CreateDramaDto) {}
