import { PartialType } from '@nestjs/mapped-types';
import { UserIdentifiersDto } from './user-identifiers.dto';

export class CheckInDto extends PartialType(UserIdentifiersDto) {}
