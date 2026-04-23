import { DataSource } from 'typeorm';
import {
  BillingCycle,
  SubscriptionPlan,
} from '../subscriptions/entities/subscription-plan.entity';

type SubscriptionPlanSeed = {
  name: string;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
  billingCycle: BillingCycle;
  isActive: boolean;
};

const subscriptionPlanSeeds: SubscriptionPlanSeed[] = [
  {
    name: 'Premium Weekly',
    description: 'Unlimited viewing for 7 days.',
    price: 2.99,
    currency: 'USD',
    durationDays: 7,
    billingCycle: BillingCycle.WEEKLY,
    isActive: true,
  },
  {
    name: 'Premium Monthly',
    description: 'Unlimited viewing for 30 days.',
    price: 9.99,
    currency: 'USD',
    durationDays: 30,
    billingCycle: BillingCycle.MONTHLY,
    isActive: true,
  },
  {
    name: 'Premium Yearly',
    description: 'Unlimited viewing for 365 days.',
    price: 99.99,
    currency: 'USD',
    durationDays: 365,
    billingCycle: BillingCycle.YEARLY,
    isActive: true,
  },
];

export const seedSubscriptionPlans = async (dataSource: DataSource) => {
  const planRepository = dataSource.getRepository(SubscriptionPlan);

  for (const planSeed of subscriptionPlanSeeds) {
    const currency = planSeed.currency.trim().toUpperCase();

    const existingPlan = await planRepository.findOne({
      where: {
        billingCycle: planSeed.billingCycle,
        currency,
      },
      order: {
        id: 'ASC',
      },
    });

    if (existingPlan) {
      existingPlan.name = planSeed.name.trim();
      existingPlan.description = planSeed.description.trim();
      existingPlan.price = planSeed.price;
      existingPlan.durationDays = planSeed.durationDays;
      existingPlan.isActive = planSeed.isActive;

      await planRepository.save(existingPlan);
      console.log(
        `Updated subscription plan: ${existingPlan.billingCycle} (${existingPlan.currency})`,
      );
      continue;
    }

    const createdPlan = await planRepository.save(
      planRepository.create({
        name: planSeed.name.trim(),
        description: planSeed.description.trim(),
        price: planSeed.price,
        currency,
        durationDays: planSeed.durationDays,
        billingCycle: planSeed.billingCycle,
        isActive: planSeed.isActive,
      }),
    );

    console.log(
      `Seeded subscription plan: ${createdPlan.billingCycle} (${createdPlan.currency})`,
    );
  }
};
