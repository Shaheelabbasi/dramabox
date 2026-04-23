import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AccountStatus } from '../enums/account-status.enum';

export class UpdateAccountStatusDto {
  @ApiProperty({ enum: AccountStatus, example: AccountStatus.BLOCKED })
  @IsEnum(AccountStatus)
  accountStatus: AccountStatus;
}
