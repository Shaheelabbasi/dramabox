import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../config/common/decorators/roles.decorator';
import { UserRole } from '../../config/common/enums/roles.enum';
import { CreateRewardRuleDto } from './dto/create-reward-rule.dto';
import { RewardsService } from './rewards.service';

@Controller('admin/rewards')
@Roles([UserRole.ADMIN])
@ApiTags('Rewards')
@ApiBearerAuth()
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Post('rules')
  @ApiOperation({ summary: 'Create reward rule (admin)' })
  @ApiBody({ type: CreateRewardRuleDto })
  createRewardRule(@Body() createRewardRuleDto: CreateRewardRuleDto) {
    return this.rewardsService.createRewardRule(createRewardRuleDto);
  }
}
