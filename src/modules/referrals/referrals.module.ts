import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReferralsService } from './referrals.service';
import {
  CreateReferralDto,
  ReferralActivityDto,
  ReferralListDto,
  ReviewReferralDto,
  CorrectReferralDto,
} from './referrals.dto';
@Controller('customer-referrals')
@Roles(
  Role.ADMIN,
  Role.AGENT,
  Role.BUSINESS_MANAGER,
  Role.SENIOR_MANAGER,
  Role.DEPUTY_DIRECTOR,
  Role.EXECUTIVE_DIRECTOR,
  Role.DIRECTOR,
)
export class ReferralsController {
  constructor(private readonly service: ReferralsService) {}
  @Get('agents') agents(@CurrentUser('id') userId: string) {
    return this.service.options(userId);
  }
  @Get() list(
    @CurrentUser('id') userId: string,
    @Query() filters: ReferralListDto,
  ) {
    return this.service.list(userId, filters);
  }
  @Get(':id') detail(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.detail(userId, id);
  }
  @Post() create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReferralDto,
  ) {
    return this.service.create(userId, dto);
  }
  @Post(':id/review') review(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewReferralDto,
  ) {
    return this.service.review(userId, id, dto);
  }
  @Post(':id/corrections') correct(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CorrectReferralDto,
  ) {
    return this.service.correct(userId, id, dto);
  }
  @Post(':id/activities') activity(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReferralActivityDto,
  ) {
    return this.service.activity(userId, id, dto);
  }
}
@Module({ controllers: [ReferralsController], providers: [ReferralsService] })
export class ReferralsModule {}
