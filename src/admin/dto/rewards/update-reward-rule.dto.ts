import { PartialType } from '@nestjs/mapped-types';
import { CreateRewardRuleDto } from './create-reward-rule.dto';

export class UpdateRewardRuleDto extends PartialType(CreateRewardRuleDto) {}
