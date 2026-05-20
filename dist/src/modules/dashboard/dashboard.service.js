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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSuperAdminStats() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const mondayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const [totalMembers, membersToday, membersThisWeek, membersThisMonth, totalDirectors, activeMembers, totalBranches, totalProperties, activeBookings, totalAdmins,] = await Promise.all([
            this.prisma.member.count(),
            this.prisma.member.count({ where: { createdAt: { gte: todayStart } } }),
            this.prisma.member.count({ where: { createdAt: { gte: mondayStart } } }),
            this.prisma.member.count({ where: { createdAt: { gte: monthStart } } }),
            this.prisma.member.count({ where: { role: client_1.Role.DIRECTOR } }),
            this.prisma.member.count({ where: { status: client_1.UserStatus.ACTIVE } }),
            this.prisma.branch.count(),
            this.prisma.property.count(),
            this.prisma.booking.count({
                where: {
                    status: {
                        notIn: [client_1.BookingStatus.COMPLETED, client_1.BookingStatus.CANCELLED],
                    },
                },
            }),
            this.prisma.admin.count(),
        ]);
        return {
            totalMembers,
            membersToday,
            membersThisWeek,
            membersThisMonth,
            totalDirectors,
            activeMembers,
            totalBranches,
            totalProperties,
            activeBookings,
            totalAdmins,
        };
    }
    async getAdminStats(branchId) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const [totalMembers, newMembersThisMonth, activeBookings, pendingBilling, completedSettlements,] = await Promise.all([
            this.prisma.member.count({ where: { branchId } }),
            this.prisma.member.count({
                where: { branchId, createdAt: { gte: monthStart } },
            }),
            this.prisma.booking.count({
                where: {
                    branchId,
                    status: {
                        notIn: [client_1.BookingStatus.COMPLETED, client_1.BookingStatus.CANCELLED],
                    },
                },
            }),
            this.prisma.billing.count({
                where: {
                    booking: { branchId },
                    status: {
                        in: [client_1.BillingStatus.PENDING, client_1.BillingStatus.PARTIAL_PAYMENT],
                    },
                },
            }),
            this.prisma.billing.count({
                where: {
                    booking: { branchId },
                    status: client_1.BillingStatus.COMPLETED,
                },
            }),
        ]);
        return {
            totalMembers,
            newMembersThisMonth,
            activeBookings,
            pendingBilling,
            completedSettlements,
        };
    }
    async getAdminMemberActivity(branchId) {
        const members = await this.prisma.member.findMany({
            where: { branchId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                memberId: true,
                fullName: true,
                role: true,
                createdAt: true,
                status: true,
            },
        });
        return members;
    }
    async getAdminBookingActivity(branchId) {
        const bookings = await this.prisma.booking.findMany({
            where: { branchId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                bookingId: true,
                applicantName: true,
                projectName: true,
                plotNumber: true,
                status: true,
                bookingDate: true,
            },
        });
        return bookings;
    }
    async getAdminBillingActivity(branchId) {
        const billing = await this.prisma.billing.findMany({
            where: {
                booking: { branchId },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                billingId: true,
                buyerName: true,
                amountInNumbers: true,
                totalBalance: true,
                status: true,
            },
        });
        return billing;
    }
    async getUserDashboard(userId, memberRole, branchId) {
        const downlineRoles = this.getDownlineRoles(memberRole);
        const [totalNetwork, activeMembers, availableProperties, unreadNotifications,] = await Promise.all([
            this.prisma.member.count({
                where: {
                    branchId,
                    role: downlineRoles.length > 0 ? { in: downlineRoles } : undefined,
                },
            }),
            this.prisma.member.count({
                where: {
                    branchId,
                    status: client_1.UserStatus.ACTIVE,
                    role: downlineRoles.length > 0 ? { in: downlineRoles } : undefined,
                },
            }),
            this.prisma.property.count({
                where: { workflowStatus: client_1.WorkflowStatus.AVAILABLE },
            }),
            memberRole === client_1.Role.DIRECTOR
                ? this.prisma.notificationRecipient.count({
                    where: {
                        user: { member: { userId } },
                        status: 'UNREAD',
                    },
                })
                : Promise.resolve(0),
        ]);
        return {
            totalNetwork,
            activeMembers,
            availableProperties,
            unreadNotifications,
        };
    }
    async getUserAlerts(memberId) {
        const member = await this.prisma.member.findUnique({
            where: { id: memberId },
            select: { role: true, branchId: true },
        });
        if (!member)
            return [];
        const downlineRoles = this.getDownlineRoles(member.role);
        const networkWhere = downlineRoles.length > 0
            ? {
                branchId: member.branchId,
            }
            : {
                branchId: member.branchId,
            };
        const [finalSettlementBookings, registrationPendingBookings] = await Promise.all([
            this.prisma.booking.findMany({
                where: {
                    ...networkWhere,
                    status: client_1.BookingStatus.FINAL_SETTLEMENT_PENDING,
                },
                take: 5,
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    bookingId: true,
                    applicantName: true,
                    projectName: true,
                    status: true,
                },
            }),
            this.prisma.booking.findMany({
                where: {
                    ...networkWhere,
                    status: client_1.BookingStatus.REGISTRATION_PENDING,
                },
                take: 5,
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    bookingId: true,
                    applicantName: true,
                    projectName: true,
                    status: true,
                },
            }),
        ]);
        const alerts = [];
        for (const booking of finalSettlementBookings) {
            alerts.push({
                type: 'FINAL_SETTLEMENT_PENDING',
                title: 'Final Settlement Pending',
                description: `Booking ${booking.bookingId} for ${booking.applicantName} (${booking.projectName}) requires final settlement.`,
                relatedId: booking.id,
            });
        }
        for (const booking of registrationPendingBookings) {
            alerts.push({
                type: 'REGISTRATION_PENDING',
                title: 'Registration Pending',
                description: `Booking ${booking.bookingId} for ${booking.applicantName} (${booking.projectName}) is pending registration.`,
                relatedId: booking.id,
            });
        }
        return alerts.slice(0, 10);
    }
    getDownlineRoles(role) {
        const hierarchy = {
            [client_1.Role.DIRECTOR]: [
                client_1.Role.EXECUTIVE_DIRECTOR,
                client_1.Role.DEPUTY_DIRECTOR,
                client_1.Role.SENIOR_MANAGER,
                client_1.Role.BUSINESS_MANAGER,
                client_1.Role.AGENT,
            ],
            [client_1.Role.EXECUTIVE_DIRECTOR]: [
                client_1.Role.DEPUTY_DIRECTOR,
                client_1.Role.SENIOR_MANAGER,
                client_1.Role.BUSINESS_MANAGER,
                client_1.Role.AGENT,
            ],
            [client_1.Role.DEPUTY_DIRECTOR]: [
                client_1.Role.SENIOR_MANAGER,
                client_1.Role.BUSINESS_MANAGER,
                client_1.Role.AGENT,
            ],
            [client_1.Role.SENIOR_MANAGER]: [client_1.Role.BUSINESS_MANAGER, client_1.Role.AGENT],
            [client_1.Role.BUSINESS_MANAGER]: [client_1.Role.AGENT],
            [client_1.Role.AGENT]: [],
        };
        return hierarchy[role] ?? [];
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map