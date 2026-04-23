import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { RewardHistory } from './entities/reward-history.entity';
import { RewardRule } from './entities/reward-rule.entity';
import { RewardsService } from './rewards.service';

@Module({
  imports: [TypeOrmModule.forFeature([RewardRule, RewardHistory, User])],
  providers: [RewardsService],
  exports: [RewardsService],
})
export class RewardsModule {}
