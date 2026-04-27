import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { VerifyGoogleCoinPurchaseDto } from './dto/verify-google-coin-purchase.dto';
import { VerifyGoogleSubscriptionDto } from './dto/verify-subscription.dto';

@Controller('subscriptions')
@ApiTags('Subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('coin-packs')
  @ApiOperation({ summary: 'Get all coin packs' })
  findAllCoinPacks() {
    return this.subscriptionsService.findAllCoinPacks();
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create a subscription plan' })
  createSubscriptionPlan(@Body() dto: CreateSubscriptionPlanDto) {
    return this.subscriptionsService.createSubscriptionPlan(dto);
  }

  @Post('google/verify')
  @ApiOperation({ summary: 'Verify Google Play subscription purchase' })
  verifyGoogleSubscription(@Body() dto: VerifyGoogleSubscriptionDto) {
    return this.subscriptionsService.verifyGoogleSubscription(dto);
  }

  @Post('google/coins/verify')
  @ApiOperation({ summary: 'Verify Google Play coin purchase and credit balance' })
  verifyGoogleCoinPurchase(@Body() dto: VerifyGoogleCoinPurchaseDto) {
    return this.subscriptionsService.verifyGoogleCoinPurchase(dto);
  }
}
