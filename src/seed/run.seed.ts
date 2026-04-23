import { AppDataSource } from '../../config/db/typeorm.config';
import { seedDramaContent } from './drama.seed';
import { seedRewardRules } from './rewards.seed';
import { seedSubscriptionPlans } from './subscription-plans.seed';
import { seedTags } from './tag.seed';
import { seedUser } from './user.seed';

async function runSeed() {
  const target = process.argv[2] ?? 'all';

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if (target === 'user' || target === 'all') {
      await seedUser(AppDataSource);
    }

    if (target === 'dramas' || target === 'all') {
      await seedDramaContent(AppDataSource);
    }

    if (target === 'tags' || target === 'all') {
      await seedTags(AppDataSource);
    }

    if (target === 'rewards' || target === 'all') {
      await seedRewardRules(AppDataSource);
    }

    if (target === 'plans' || target === 'all') {
      await seedSubscriptionPlans(AppDataSource);
    }

    console.log('Seed completed successfully.');
  } catch (error) {
    console.error('Seed failed.', error);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

void runSeed();
