"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const dashboard_service_1 = require("./dashboard.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const MOBILE_ROLES = [
    client_1.Role.DIRECTOR,
    client_1.Role.EXECUTIVE_DIRECTOR,
    client_1.Role.DEPUTY_DIRECTOR,
    client_1.Role.SENIOR_MANAGER,
    client_1.Role.BUSINESS_MANAGER,
    client_1.Role.AGENT,
];
let DashboardController = class DashboardController {
    dashboardService;
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    getSuperAdminStats() {
        return this.dashboardService.getSuperAdminStats();
    }
    getAdminStats(user) {
        return this.dashboardService.getAdminStats(user.admin?.branchId);
    }
    getAdminMemberActivity(user) {
        return this.dashboardService.getAdminMemberActivity(user.admin?.branchId);
    }
    getAdminBookingActivity(user) {
        return this.dashboardService.getAdminBookingActivity(user.admin?.branchId);
    }
    getAdminBillingActivity(user) {
        return this.dashboardService.getAdminBillingActivity(user.admin?.branchId);
    }
    getUserDashboard(user) {
        return this.dashboardService.getUserDashboard(user.id, user.member?.role, user.member?.branchId);
    }
    getUserAlerts(user) {
        return this.dashboardService.getUserAlerts(user.member?.id);
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('super-admin/dashboard/stats'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Super admin global dashboard stats' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getSuperAdminStats", null);
__decorate([
    (0, common_1.Get)('admin/dashboard/stats'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Admin branch-scoped dashboard stats' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getAdminStats", null);
__decorate([
    (0, common_1.Get)('admin/dashboard/member-activity'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Last 10 members in branch' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getAdminMemberActivity", null);
__decorate([
    (0, common_1.Get)('admin/dashboard/booking-activity'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Last 10 bookings in branch' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getAdminBookingActivity", null);
__decorate([
    (0, common_1.Get)('admin/dashboard/billing-activity'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Last 10 billing records in branch' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getAdminBillingActivity", null);
__decorate([
    (0, common_1.Get)('user/dashboard'),
    (0, roles_decorator_1.Roles)(...MOBILE_ROLES),
    (0, swagger_1.ApiOperation)({ summary: 'Mobile user dashboard stats' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getUserDashboard", null);
__decorate([
    (0, common_1.Get)('user/dashboard/alerts'),
    (0, roles_decorator_1.Roles)(...MOBILE_ROLES),
    (0, swagger_1.ApiOperation)({ summary: 'Mobile user dashboard alerts' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getUserAlerts", null);
exports.DashboardController = DashboardController = __decorate([
    (0, swagger_1.ApiTags)('Dashboard'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map