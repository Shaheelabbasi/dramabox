import { DataSource } from 'typeorm';
import { CoinPack } from '../subscriptions/entities/coin-pack.entity';

type CoinPackSeed = {
  name: string;
  description: string | null;
  googleProductId: string;
  coins: number;
  bonusCoins: number;
  price: number;
  currency: string;
  isActive: boolean;
};

const coinPackSeeds: CoinPackSeed[] = [
  {
    name: '3000 Coins',
    description:
      'Purchase 3000 coins to unlock paid content and episodes on Dramafy.',
    googleProductId: 'coins_3000',
    coins: 3000,
    bonusCoins: 150,
    price: 4500,
    currency: 'PKR',
    isActive: true,
  },
];

export const seedCoinPacks = async (dataSource: DataSource) => {
  const coinPackRepository = dataSource.getRepository(CoinPack);

  for (const coinPackSeed of coinPackSeeds) {
    const googleProductId = coinPackSeed.googleProductId.trim();
    const currency = coinPackSeed.currency.trim().toUpperCase();

    const existingCoinPack = await coinPackRepository.findOne({
      where: { googleProductId },
    });

    if (existingCoinPack) {
      existingCoinPack.name = coinPackSeed.name.trim();
      existingCoinPack.description = coinPackSeed.description?.trim() ?? null;
      existingCoinPack.coins = coinPackSeed.coins;
      existingCoinPack.bonusCoins = coinPackSeed.bonusCoins;
      existingCoinPack.price = coinPackSeed.price;
      existingCoinPack.currency = currency;
      existingCoinPack.isActive = coinPackSeed.isActive;
      await coinPackRepository.save(existingCoinPack);
      console.log(`Updated coin pack: ${existingCoinPack.googleProductId}`);
      continue;
    }

    const createdCoinPack = await coinPackRepository.save(
      coinPackRepository.create({
        name: coinPackSeed.name.trim(),
        description: coinPackSeed.description?.trim() ?? null,
        googleProductId,
        coins: coinPackSeed.coins,
        bonusCoins: coinPackSeed.bonusCoins,
        price: coinPackSeed.price,
        currency,
        isActive: coinPackSeed.isActive,
      }),
    );

    console.log(`Seeded coin pack: ${createdCoinPack.googleProductId}`);
  }
};
