import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../config/common/decorators/roles.decorator';
import { UserRole } from '../../../config/common/enums/roles.enum';
import { AdminAnalyticsService } from './admin-analytics.service';

@Controller('admin/analytics')
@Roles([UserRole.ADMIN])
@ApiTags('Admin Analytics')
@ApiBearerAuth()
export class AdminAnalyticsController {
  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  @Get('revenue-data')
  @ApiOperation({ summary: 'Get revenue data dashboard metrics' })
  getRevenueData() {
    return this.adminAnalyticsService.getRevenueData();
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get subscriber data dashboard metrics' })
  getSubscriberData() {
    return this.adminAnalyticsService.getSubscriberData();
  }
}
