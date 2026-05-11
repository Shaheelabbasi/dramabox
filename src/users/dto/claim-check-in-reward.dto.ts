import { IsString, Matches } from 'class-validator';
import { CheckInDto } from './check-in.dto';

export class ClaimCheckInRewardDto extends CheckInDto {
  @IsString()
  @Matches(/^streak_day_[1-7]$/)
  ruleCode: string;
}
