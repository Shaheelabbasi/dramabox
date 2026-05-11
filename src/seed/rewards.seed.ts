import { DataSource } from 'typeorm';
import { RewardRule } from '../rewards/entities/reward-rule.entity';

type RewardRuleSeed = {
  code: string;
  name: string;
  coins: number;
  isActive: boolean;
  cooldownSeconds: number | null;
  maxPerDay: number | null;
};

const rewardRuleSeeds: RewardRuleSeed[] = [
  {
    code: 'daily_login',
    name: 'Daily Login Reward',
    coins: 10,
    isActive: true,
    cooldownSeconds: 86400,
    maxPerDay: 1,
  },
  {
    code: 'episode_complete',
    name: 'Episode Complete Reward',
    coins: 20,
    isActive: true,
    cooldownSeconds: null,
    maxPerDay: null,
  },
  {
    code: 'watch_5_min',
    name: 'Watch 5 Minutes',
    coins: 5,
    isActive: true,
    cooldownSeconds: 3600,
    maxPerDay: 3,
  },
  {
    code: 'first_episode_bonus',
    name: 'First Episode Bonus',
    coins: 50,
    isActive: true,
    cooldownSeconds: null,
    maxPerDay: 1,
  },
  {
    code: 'streak_day_1',
    name: 'Streak Day 1 Reward',
    coins: 10,
    isActive: true,
    cooldownSeconds: null,
    maxPerDay: null,
  },
  {
    code: 'streak_day_2',
    name: 'Streak Day 2 Reward',
    coins: 10,
    isActive: true,
    cooldownSeconds: null,
    maxPerDay: null,
  },
  {
    code: 'streak_day_3',
    name: 'Streak Day 3 Reward',
    coins: 20,
    isActive: true,
    cooldownSeconds: null,
    maxPerDay: null,
  },
  {
    code: 'streak_day_4',
    name: 'Streak Day 4 Reward',
    coins: 20,
    isActive: true,
    cooldownSeconds: null,
    maxPerDay: null,
  },
  {
    code: 'streak_day_5',
    name: 'Streak Day 5 Reward',
    coins: 25,
    isActive: true,
    cooldownSeconds: null,
    maxPerDay: null,
  },
  {
    code: 'streak_day_6',
    name: 'Streak Day 6 Reward',
    coins: 30,
    isActive: true,
    cooldownSeconds: null,
    maxPerDay: null,
  },
  {
    code: 'streak_day_7',
    name: 'Streak Day 7 Reward',
    coins: 50,
    isActive: true,
    cooldownSeconds: null,
    maxPerDay: null,
  },
];

export const seedRewardRules = async (dataSource: DataSource) => {
  const rewardRuleRepository = dataSource.getRepository(RewardRule);

  for (const rewardRuleSeed of rewardRuleSeeds) {
    const code = rewardRuleSeed.code.trim().toLowerCase();
    const name = rewardRuleSeed.name.trim();

    const existingRule = await rewardRuleRepository.findOne({
      where: { code },
    });

    if (existingRule) {
      existingRule.name = name;
      existingRule.coins = rewardRuleSeed.coins;
      existingRule.isActive = rewardRuleSeed.isActive;
      existingRule.cooldownSeconds = rewardRuleSeed.cooldownSeconds;
      existingRule.maxPerDay = rewardRuleSeed.maxPerDay;
      await rewardRuleRepository.save(existingRule);
      console.log(`Updated reward rule: ${existingRule.code}`);
      continue;
    }

    const createdRule = await rewardRuleRepository.save(
      rewardRuleRepository.create({
        code,
        name,
        coins: rewardRuleSeed.coins,
        isActive: rewardRuleSeed.isActive,
        cooldownSeconds: rewardRuleSeed.cooldownSeconds,
        maxPerDay: rewardRuleSeed.maxPerDay,
      }),
    );
    console.log(`Seeded reward rule: ${createdRule.code}`);
  }
};
