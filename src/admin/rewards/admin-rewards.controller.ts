import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../config/common/decorators/roles.decorator';
import { UserRole } from '../../../config/common/enums/roles.enum';
import { AdminRewardsService } from './admin-rewards.service';
import { CreateRewardRuleDto } from '../dto/rewards/create-reward-rule.dto';
import { GrantRewardDto } from '../dto/rewards/grant-reward.dto';
import { ListRewardRulesDto } from '../dto/rewards/list-reward-rules.dto';
import { ListRewardsHistoryDto } from '../dto/rewards/list-rewards-history.dto';
import { UpdateRewardRuleDto } from '../dto/rewards/update-reward-rule.dto';
import { ApplyRewardDto } from '../dto/rewards/apply-reward.dto';

@Controller('admin')
@Roles([UserRole.ADMIN])
@ApiTags('Admin Rewards')
@ApiBearerAuth()
export class AdminRewardsController {
  constructor(private readonly adminRewardsService: AdminRewardsService) {}

  @Post('reward-rules')
  @ApiOperation({ summary: 'Create a reward rule' })
  @ApiBody({ type: CreateRewardRuleDto })
  createRewardRule(@Body() createRewardRuleDto: CreateRewardRuleDto) {
    return this.adminRewardsService.createRewardRule(createRewardRuleDto);
  }

  @Patch('reward-rules/:id')
  @ApiOperation({ summary: 'Update a reward rule' })
  @ApiParam({ name: 'id', type: Number, description: 'Reward Rule ID' })
  @ApiBody({ type: UpdateRewardRuleDto })
  updateRewardRule(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRewardRuleDto: UpdateRewardRuleDto,
  ) {
    return this.adminRewardsService.updateRewardRule(id, updateRewardRuleDto);
  }

  @Get('reward-rules')
  @ApiOperation({ summary: 'Get reward rules (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  findRewardRules(@Query() listRewardRulesDto: ListRewardRulesDto) {
    return this.adminRewardsService.findRewardRules(listRewardRulesDto);
  }

  @Post('rewards/grant')
  @ApiOperation({ summary: 'Grant or deduct coins for a user' })
  @ApiBody({ type: GrantRewardDto })
  grantReward(@Body() grantRewardDto: GrantRewardDto) {
    return this.adminRewardsService.grantReward(grantRewardDto);
  }

  @Post('rewards/apply')
  @ApiOperation({
    summary: 'Apply reward by rule code (core flow test endpoint)',
  })
  @ApiBody({ type: ApplyRewardDto })
  applyReward(@Body() applyRewardDto: ApplyRewardDto) {
    return this.adminRewardsService.applyReward(applyRewardDto);
  }

  @Get('rewards/history')
  @ApiOperation({ summary: 'Get rewards history (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @ApiQuery({ name: 'userId', required: false, type: Number, example: 5 })
  findRewardsHistory(@Query() listRewardsHistoryDto: ListRewardsHistoryDto) {
    return this.adminRewardsService.findRewardsHistory(listRewardsHistoryDto);
  }
}
