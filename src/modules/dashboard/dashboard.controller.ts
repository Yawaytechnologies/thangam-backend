import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const MOBILE_ROLES = [
  Role.DIRECTOR,
  Role.EXECUTIVE_DIRECTOR,
  Role.DEPUTY_DIRECTOR,
  Role.SENIOR_MANAGER,
  Role.BUSINESS_MANAGER,
  Role.AGENT,
];

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ─── Super Admin ────────────────────────────────────────────────────────

  @Get('super-admin/dashboard/stats')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Super admin global dashboard stats' })
  getSuperAdminStats() {
    return this.dashboardService.getSuperAdminStats();
  }

  // ─── Admin ──────────────────────────────────────────────────────────────

  @Get('admin/dashboard/stats')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin branch-scoped dashboard stats' })
  getAdminStats(@CurrentUser() user: any) {
    return this.dashboardService.getAdminStats(user.admin?.branchId);
  }

  @Get('admin/dashboard/member-activity')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Last 10 members in branch' })
  getAdminMemberActivity(@CurrentUser() user: any) {
    return this.dashboardService.getAdminMemberActivity(user.admin?.branchId);
  }

  @Get('admin/dashboard/booking-activity')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Last 10 bookings in branch' })
  getAdminBookingActivity(@CurrentUser() user: any) {
    return this.dashboardService.getAdminBookingActivity(user.admin?.branchId);
  }

  @Get('admin/dashboard/billing-activity')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Last 10 billing records in branch' })
  getAdminBillingActivity(@CurrentUser() user: any) {
    return this.dashboardService.getAdminBillingActivity(user.admin?.branchId);
  }

  // ─── User / Mobile ──────────────────────────────────────────────────────

  @Get('user/dashboard')
  @Roles(...MOBILE_ROLES)
  @ApiOperation({ summary: 'Mobile user dashboard stats' })
  getUserDashboard(@CurrentUser() user: any) {
    return this.dashboardService.getUserDashboard(
      user.id,
      user.member?.role,
      user.member?.branchId,
    );
  }

  @Get('user/dashboard/alerts')
  @Roles(...MOBILE_ROLES)
  @ApiOperation({ summary: 'Mobile user dashboard alerts' })
  getUserAlerts(@CurrentUser() user: any) {
    return this.dashboardService.getUserAlerts(user.member?.id);
  }
}
