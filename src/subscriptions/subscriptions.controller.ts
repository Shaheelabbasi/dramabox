import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { VerifyGoogleSubscriptionDto } from './dto/verify-subscription.dto';
//import { VerifyGoogleSubscriptionDto } from './dto/verify-google-subscription.dto';

@Controller('subscriptions')
@ApiTags('Subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('google/verify')
  @ApiOperation({ summary: 'Verify Google Play subscription purchase' })
  verifyGoogleSubscription(@Body() dto: VerifyGoogleSubscriptionDto) {
    return this.subscriptionsService.verifyGoogleSubscription(dto);
  }

  @Post('test')
  @ApiOperation({ summary: 'gfgfhgfhgfh gfhg ghhgh' })
  testfilePath() {
    return this.subscriptionsService.testfilePath();
  }
}
