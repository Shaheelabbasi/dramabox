import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { PageDto } from '../../../config/common/dto/page.dto';
import { PageMetaDto } from '../../../config/common/dto/page-meta.dto';
import { User } from '../../users/entities/user.entity';
import {
  RewardEntryType,
  RewardHistory,
} from '../../rewards/entities/reward-history.entity';
import { RewardRule } from '../../rewards/entities/reward-rule.entity';
import { RewardsService } from '../../rewards/rewards.service';
import { ApplyRewardDto } from '../dto/rewards/apply-reward.dto';
import { CreateRewardRuleDto } from '../dto/rewards/create-reward-rule.dto';
import { GrantRewardDto } from '../dto/rewards/grant-reward.dto';
import { ListRewardRulesDto } from '../dto/rewards/list-reward-rules.dto';
import { ListRewardsHistoryDto } from '../dto/rewards/list-rewards-history.dto';
import { TopUpBalanceDto } from '../dto/rewards/top-up-balance.dto';
import { UpdateRewardRuleDto } from '../dto/rewards/update-reward-rule.dto';

@Injectable()
export class AdminRewardsService {
  constructor(
    @InjectRepository(RewardRule)
    private readonly rewardRuleRepository: Repository<RewardRule>,
    @InjectRepository(RewardHistory)
    private readonly rewardHistoryRepository: Repository<RewardHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly rewardsService: RewardsService,
  ) {}

  async createRewardRule(createRewardRuleDto: CreateRewardRuleDto) {
    const code = createRewardRuleDto.code.trim().toLowerCase();
    const name = createRewardRuleDto.name.trim();

    const existingRule = await this.rewardRuleRepository.findOne({
      where: { code },
    });

    if (existingRule) {
      throw new BadRequestException('Reward rule already exists');
    }

    const rule = await this.rewardRuleRepository.save(
      this.rewardRuleRepository.create({
        code,
        name,
        coins: createRewardRuleDto.coins,
        isActive: createRewardRuleDto.isActive ?? true,
        cooldownSeconds: createRewardRuleDto.cooldownSeconds ?? null,
        maxPerDay: createRewardRuleDto.maxPerDay ?? null,
      }),
    );

    return this.toRewardRuleResponse(rule);
  }

  async updateRewardRule(
    ruleId: number,
    updateRewardRuleDto: UpdateRewardRuleDto,
  ) {
    const rule = await this.rewardRuleRepository.findOne({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException(`Reward rule ${ruleId} not found`);
    }

    if (updateRewardRuleDto.code !== undefined) {
      const code = updateRewardRuleDto.code.trim().toLowerCase();
      if (!code) {
        throw new BadRequestException('Reward rule code is required');
      }

      const existingRule = await this.rewardRuleRepository.findOne({
        where: { code },
      });

      if (existingRule && existingRule.id !== ruleId) {
        throw new BadRequestException('Reward rule code already exists');
      }

      rule.code = code;
    }

    if (updateRewardRuleDto.name !== undefined) {
      const name = updateRewardRuleDto.name.trim();
      if (!name) {
        throw new BadRequestException('Reward rule name is required');
      }
      rule.name = name;
    }

    if (updateRewardRuleDto.coins !== undefined) {
      rule.coins = updateRewardRuleDto.coins;
    }

    if (updateRewardRuleDto.isActive !== undefined) {
      rule.isActive = updateRewardRuleDto.isActive;
    }

    if (updateRewardRuleDto.cooldownSeconds !== undefined) {
      rule.cooldownSeconds = updateRewardRuleDto.cooldownSeconds;
    }

    if (updateRewardRuleDto.maxPerDay !== undefined) {
      rule.maxPerDay = updateRewardRuleDto.maxPerDay;
    }

    const updatedRule = await this.rewardRuleRepository.save(rule);
    return this.toRewardRuleResponse(updatedRule);
  }

  async findRewardRules(
    pageOptionsDto: ListRewardRulesDto = new ListRewardRulesDto(),
  ) {
    const [rules, itemCount] = await this.rewardRuleRepository.findAndCount({
      order: { createdAt: pageOptionsDto.order },
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
    });

    const data = rules.map((rule) => this.toRewardRuleResponse(rule));
    const meta = new PageMetaDto({ pageOptionsDto, itemCount });

    return new PageDto(data, meta);
  }

  async grantReward(grantRewardDto: GrantRewardDto) {
    const rule = await this.resolveRule(grantRewardDto.ruleId);
    const user = await this.userRepository.findOne({
      where: { id: grantRewardDto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${grantRewardDto.userId} not found`);
    }

    const entryType = grantRewardDto.entryType ?? RewardEntryType.MANUAL;
    const idempotencyKey =
      grantRewardDto.idempotencyKey ??
      `manual:${grantRewardDto.userId}:${Date.now()}`;

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const previousBalance = user.balance;
        const newBalance = previousBalance + grantRewardDto.coinsDelta;

        if (newBalance < 0) {
          throw new BadRequestException('Insufficient user balance');
        }

        const historyRepo = manager.getRepository(RewardHistory);
        const userRepo = manager.getRepository(User);

        const savedHistory = await historyRepo.save(
          historyRepo.create({
            userId: user.id,
            ruleId: rule?.id ?? null,
            entryType,
            coinsDelta: grantRewardDto.coinsDelta,
            referenceType: grantRewardDto.referenceType?.trim() || null,
            referenceId: grantRewardDto.referenceId?.trim() || null,
            idempotencyKey,
          }),
        );

        user.balance = newBalance;
        await userRepo.save(user);

        return {
          history: savedHistory,
          previousBalance,
          newBalance,
        };
      });

      return {
        user_id: user.id,
        previous_balance: result.previousBalance,
        new_balance: result.newBalance,
        transaction: this.toRewardHistoryResponse(result.history),
      };
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as { code?: string }).code === '23505'
      ) {
        throw new BadRequestException(
          'Reward already processed for this idempotency key',
        );
      }
      throw error;
    }
  }

  async topUpBalance(topUpBalanceDto: TopUpBalanceDto) {
    return this.grantReward({
      userId: topUpBalanceDto.userId,
      coinsDelta: topUpBalanceDto.amount,
      entryType: RewardEntryType.MANUAL,
      referenceType: 'admin_balance_topup',
      referenceId: topUpBalanceDto.referenceId,
      idempotencyKey:
        topUpBalanceDto.idempotencyKey ??
        `admin_balance_topup:${topUpBalanceDto.userId}:${Date.now()}`,
    });
  }

  async applyReward(applyRewardDto: ApplyRewardDto) {
    return this.rewardsService.applyReward({
      userId: applyRewardDto.userId,
      ruleCode: applyRewardDto.ruleCode,
      entryType: applyRewardDto.entryType,
      referenceType: applyRewardDto.referenceType,
      referenceId: applyRewardDto.referenceId,
      idempotencyKey: applyRewardDto.idempotencyKey,
    });
  }

  async findRewardsHistory(
    pageOptionsDto: ListRewardsHistoryDto = new ListRewardsHistoryDto(),
  ) {
    const queryBuilder = this.rewardHistoryRepository
      .createQueryBuilder('history')
      .leftJoinAndSelect('history.user', 'user')
      .leftJoinAndSelect('history.rule', 'rule')
      .orderBy('history.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    if (pageOptionsDto.userId) {
      queryBuilder.andWhere('history.userId = :userId', {
        userId: pageOptionsDto.userId,
      });
    }

    const [histories, itemCount] = await queryBuilder.getManyAndCount();
    const data = histories.map((history) =>
      this.toRewardHistoryResponse(history),
    );
    const meta = new PageMetaDto({ pageOptionsDto, itemCount });

    return new PageDto(data, meta);
  }

  private async resolveRule(ruleId?: number) {
    if (!ruleId) {
      return null;
    }

    const rule = await this.rewardRuleRepository.findOne({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException(`Reward rule ${ruleId} not found`);
    }

    return rule;
  }

  private toRewardRuleResponse(rule: RewardRule) {
    return {
      id: rule.id,
      code: rule.code,
      name: rule.name,
      coins: rule.coins,
      is_active: rule.isActive,
      cooldown_seconds: rule.cooldownSeconds,
      max_per_day: rule.maxPerDay,
      created_at: rule.createdAt,
      updated_at: rule.updatedAt,
    };
  }

  private toRewardHistoryResponse(history: RewardHistory) {
    return {
      id: history.id,
      user_id: history.userId,
      rule_id: history.ruleId,
      entry_type: history.entryType,
      coins_delta: history.coinsDelta,
      reference_type: history.referenceType,
      reference_id: history.referenceId,
      idempotency_key: history.idempotencyKey,
      created_at: history.createdAt,
      updated_at: history.updatedAt,
    };
  }
}
