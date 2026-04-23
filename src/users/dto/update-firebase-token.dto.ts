import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { UserIdentifiersDto } from './user-identifiers.dto';

export class UpdateFirebaseTokenDto extends PartialType(UserIdentifiersDto) {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  firebaseToken: string;
}
