import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { UserIdentifiersDto } from './user-identifiers.dto';

export class UpdateUserDetailsDto extends PartialType(UserIdentifiersDto) {
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @IsOptional()
  @IsString()
  firebaseToken?: string;
}
