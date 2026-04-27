import { BaseTimestamps } from '../../../config/common/entitities/timestamp.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'coin_packs' })
export class CoinPack extends BaseTimestamps {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: '100 Coins' })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiPropertyOptional({
    example: 'Buy 100 coins to unlock more episodes.',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @ApiProperty({ example: 'coins_100' })
  @Column({ name: 'google_product_id', type: 'varchar', length: 150 })
  googleProductId: string;

  @ApiProperty({ example: 100 })
  @Column({ type: 'integer' })
  coins: number;

  @ApiProperty({ example: 100 })
  @Column({ type: 'integer', name: 'bonus_coins' })
  bonusCoins: number;

  @ApiProperty({ example: 0.99 })
  @Column({ type: 'double precision' })
  price: number;

  @ApiProperty({ example: 'USD' })
  @Column({ type: 'char', length: 3, default: 'USD' })
  currency: string;

  @ApiProperty({ example: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
