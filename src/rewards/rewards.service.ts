import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import {
  RewardEntryType,
  RewardHistory,
} from './entities/reward-history.entity';
import { RewardRule } from './entities/reward-rule.entity';

export type ApplyRewardInput = {
  userId: number;
  ruleCode: string;
  entryType?: RewardEntryType;
  referenceType?: string;
  referenceId?: string;
  idempotencyKey: string;
};

@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(RewardRule)
    private readonly rewardRuleRepository: Repository<RewardRule>,
    @InjectRepository(RewardHistory)
    private readonly rewardHistoryRepository: Repository<RewardHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async applyReward(input: ApplyRewardInput) {
    const ruleCode = input.ruleCode.trim().toLowerCase();
    const idempotencyKey = input.idempotencyKey.trim();

    if (!idempotencyKey) {
      throw new BadRequestException('idempotencyKey is required');
    }

    const existingHistory = await this.rewardHistoryRepository.findOne({
      where: { idempotencyKey },
    });

    if (existingHistory) {
      const existingUser = await this.userRepository.findOne({
        where: { id: existingHistory.userId },
      });

      return {
        status: 'already_applied',
        user_id: existingHistory.userId,
        rule_id: existingHistory.ruleId,
        entry_type: existingHistory.entryType,
        coins_delta: existingHistory.coinsDelta,
        idempotency_key: existingHistory.idempotencyKey,
        balance: existingUser?.balance ?? null,
        created_at: existingHistory.createdAt,
      };
    }

    const rule = await this.rewardRuleRepository.findOne({
      where: { code: ruleCode },
    });

    if (!rule) {
      throw new NotFoundException(`Reward rule ${ruleCode} not found`);
    }

    if (!rule.isActive) {
      throw new BadRequestException(`Reward rule ${ruleCode} is inactive`);
    }

    await this.enforceRuleLimits(input.userId, rule);

    const entryType = input.entryType ?? RewardEntryType.REWARD;

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository(User);
        const historyRepo = manager.getRepository(RewardHistory);

        const user = await userRepo.findOne({
          where: { id: input.userId },
        });

        if (!user) {
          throw new NotFoundException(`User ${input.userId} not found`);
        }

        const nextBalance = user.balance + rule.coins;
        if (nextBalance < 0) {
          throw new BadRequestException('Insufficient user balance');
        }

        const history = await historyRepo.save(
          historyRepo.create({
            userId: user.id,
            ruleId: rule.id,
            entryType,
            coinsDelta: rule.coins,
            referenceType: input.referenceType?.trim() || null,
            referenceId: input.referenceId?.trim() || null,
            idempotencyKey,
          }),
        );

        user.balance = nextBalance;
        await userRepo.save(user);

        return {
          history,
          balance: user.balance,
          rule,
        };
      });

      return {
        status: 'applied',
        user_id: input.userId,
        rule_id: result.rule.id,
        rule_code: result.rule.code,
        entry_type: result.history.entryType,
        coins_delta: result.history.coinsDelta,
        idempotency_key: result.history.idempotencyKey,
        balance: result.balance,
        created_at: result.history.createdAt,
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

  async findRuleByCode(ruleCode: string) {
    const normalizedRuleCode = ruleCode.trim().toLowerCase();

    if (!normalizedRuleCode) {
      throw new BadRequestException('ruleCode is required');
    }

    return this.rewardRuleRepository.findOne({
      where: { code: normalizedRuleCode },
    });
  }

  private async enforceRuleLimits(userId: number, rule: RewardRule) {
    const now = new Date();

    if (rule.cooldownSeconds && rule.cooldownSeconds > 0) {
      const latestEntry = await this.rewardHistoryRepository.findOne({
        where: {
          userId,
          ruleId: rule.id,
        },
        order: {
          createdAt: 'DESC',
        },
      });

      if (latestEntry) {
        const secondsSinceLast =
          (now.getTime() - latestEntry.createdAt.getTime()) / 1000;

        if (secondsSinceLast < rule.cooldownSeconds) {
          const remaining = Math.ceil(rule.cooldownSeconds - secondsSinceLast);
          throw new BadRequestException(
            `Reward cooldown active. Try again in ${remaining} seconds`,
          );
        }
      }
    }

    if (rule.maxPerDay && rule.maxPerDay > 0) {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const countToday = await this.rewardHistoryRepository
        .createQueryBuilder('history')
        .where('history.user_id = :userId', { userId })
        .andWhere('history.rule_id = :ruleId', { ruleId: rule.id })
        .andWhere('history.created_at BETWEEN :startOfDay AND :endOfDay', {
          startOfDay,
          endOfDay,
        })
        .getCount();

      if (countToday >= rule.maxPerDay) {
        throw new BadRequestException(
          `Daily limit reached for reward rule ${rule.code}`,
        );
      }
    }
  }
}
