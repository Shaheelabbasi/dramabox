import { DataSource } from 'typeorm';
import {
  BillingCycle,
  SubscriptionPlan,
} from '../subscriptions/entities/subscription-plan.entity';
import { SubscriptionBasePlan } from '../subscriptions/entities/base-plans.entity';
import { SubscriptionOffer } from '../subscriptions/entities/subscription-offers.entity';

type SubscriptionPlanSeed = {
  name: string;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
  billingCycle: BillingCycle;
  isActive: boolean;
  googleProductId: string;
  basePlan: SubscriptionBasePlanSeed;
};

type SubscriptionBasePlanSeed = {
  basePlanId: string;
  type: string;
  billingPeriod: string;
  gracePeriodDays: number;
  accountHoldDays: number;
  resubscribeAllowed: boolean;
  customerPlanChanges: string;
  offers: SubscriptionOfferSeed[];
};

type SubscriptionOfferSeed = {
  offerId: string;
  type: string;
  eligibility: string;
  introPrice: number | null;
  introDurationWeeks: number | null;
  discountPercentage: number | null;
  billingPeriods: number | null;
  freeTrialDays: number | null;
};

const subscriptionPlanSeeds: SubscriptionPlanSeed[] = [
  {
    name: 'Weekly Membership',
    description: 'Unlimited access to all paid dramas and episodes on Dramafy.',
    price: 1700,
    currency: 'PKR',
    durationDays: 7,
    billingCycle: BillingCycle.WEEKLY,
    isActive: true,
    googleProductId: 'weekly_membership',
    basePlan: {
      basePlanId: 'weekly-base',
      type: 'auto-renewing',
      billingPeriod: 'weekly',
      gracePeriodDays: 3,
      accountHoldDays: 27,
      resubscribeAllowed: true,
      customerPlanChanges: 'charge_at_next_billing_date',
      offers: [
        {
          offerId: 'weekly-intro-offer',
          type: 'introductory',
          eligibility: 'new_subscribers_only',
          introPrice: 1150,
          introDurationWeeks: 3,
          discountPercentage: 32.35,
          billingPeriods: 3,
          freeTrialDays: null,
        },
      ],
    },
  },
  {
    name: 'Annual Membership',
    description:
      'Unlimited access to all paid dramas and episodes on Dramafy for a full year.',
    price: 13900,
    currency: 'PKR',
    durationDays: 365,
    billingCycle: BillingCycle.YEARLY,
    isActive: true,
    googleProductId: 'yearly_membership',
    basePlan: {
      basePlanId: 'yearly-base',
      type: 'auto-renewing',
      billingPeriod: 'yearly',
      gracePeriodDays: 3,
      accountHoldDays: 27,
      resubscribeAllowed: true,
      customerPlanChanges: 'charge_at_next_billing_date',
      offers: [],
    },
  },
];


export const seedSubscriptionPlans = async (dataSource: DataSource) => {
  const planRepository = dataSource.getRepository(SubscriptionPlan);
  const basePlanRepository = dataSource.getRepository(SubscriptionBasePlan);
  const offerRepository = dataSource.getRepository(SubscriptionOffer);

  for (const planSeed of subscriptionPlanSeeds) {
    const currency = planSeed.currency.trim().toUpperCase();
    const googleProductId = planSeed.googleProductId.trim();

    const existingPlan = await planRepository.findOne({
      where: {
        googleProductId,
      },
    });

    const planToSave = existingPlan ?? planRepository.create();
    planToSave.name = planSeed.name.trim();
    planToSave.description = planSeed.description.trim();
    planToSave.price = planSeed.price;
    planToSave.currency = currency;
    planToSave.durationDays = planSeed.durationDays;
    planToSave.billingCycle = planSeed.billingCycle;
    planToSave.isActive = planSeed.isActive;
    planToSave.googleProductId = googleProductId;

    const savedPlan = await planRepository.save(planToSave);

    const existingBasePlan = await basePlanRepository.findOne({
      where: {
        planId: savedPlan.id,
        basePlanId: planSeed.basePlan.basePlanId.trim(),
      },
    });

    const basePlanToSave = existingBasePlan ?? basePlanRepository.create();
    basePlanToSave.planId = savedPlan.id;
    basePlanToSave.basePlanId = planSeed.basePlan.basePlanId.trim();
    basePlanToSave.type = planSeed.basePlan.type.trim();
    basePlanToSave.billingPeriod = planSeed.basePlan.billingPeriod.trim();
    basePlanToSave.gracePeriodDays = planSeed.basePlan.gracePeriodDays;
    basePlanToSave.accountHoldDays = planSeed.basePlan.accountHoldDays;
    basePlanToSave.resubscribeAllowed = planSeed.basePlan.resubscribeAllowed;
    basePlanToSave.customerPlanChanges =
      planSeed.basePlan.customerPlanChanges.trim();
    basePlanToSave.isActive = planSeed.isActive;

    const savedBasePlan = await basePlanRepository.save(basePlanToSave);

    const existingOffers = await offerRepository.find({
      where: { basePlanId: savedBasePlan.id },
    });
    const existingOfferById = new Map(
      existingOffers.map((offer) => [offer.offerId, offer]),
    );
    const seedOfferIds = new Set(planSeed.basePlan.offers.map((o) => o.offerId));

    for (const offerSeed of planSeed.basePlan.offers) {
      const offerId = offerSeed.offerId.trim();
      const existingOffer = existingOfferById.get(offerId);
      const offerToSave = existingOffer ?? offerRepository.create();

      offerToSave.basePlanId = savedBasePlan.id;
      offerToSave.offerId = offerId;
      offerToSave.type = offerSeed.type.trim();
      offerToSave.eligibility = offerSeed.eligibility.trim();
      offerToSave.isActive = planSeed.isActive;
      offerToSave.introPrice = offerSeed.introPrice;
      offerToSave.introDurationWeeks = offerSeed.introDurationWeeks;
      offerToSave.discountPercentage = offerSeed.discountPercentage;
      offerToSave.billingPeriods = offerSeed.billingPeriods;
      offerToSave.freeTrialDays = offerSeed.freeTrialDays;

      await offerRepository.save(offerToSave);
    }

    const offersToDelete = existingOffers.filter(
      (offer) => !seedOfferIds.has(offer.offerId),
    );
    if (offersToDelete.length > 0) {
      await offerRepository.remove(offersToDelete);
    }

    console.log(
      `${existingPlan ? 'Updated' : 'Seeded'} subscription plan: ${savedPlan.name} (${savedPlan.googleProductId})`,
    );
  }
};
