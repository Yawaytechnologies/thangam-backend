import { Injectable } from '@nestjs/common';
import { BookingStatus, BillingStatus, Role, UserStatus, WorkflowStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Super Admin ──────────────────────────────────────────────────────────

  async getSuperAdminStats() {
    const now = new Date();

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const dayOfWeek = now.getDay(); // 0 = Sunday
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const [
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
    ] = await Promise.all([
      this.prisma.member.count(),
      this.prisma.member.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.member.count({ where: { createdAt: { gte: mondayStart } } }),
      this.prisma.member.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.member.count({ where: { role: Role.DIRECTOR } }),
      this.prisma.member.count({ where: { status: UserStatus.ACTIVE } }),
      this.prisma.branch.count(),
      this.prisma.property.count(),
      this.prisma.booking.count({
        where: {
          status: {
            notIn: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
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

  // ─── Admin ────────────────────────────────────────────────────────────────

  async getAdminStats(branchId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const [
      totalMembers,
      newMembersThisMonth,
      activeBookings,
      pendingBilling,
      completedSettlements,
    ] = await Promise.all([
      this.prisma.member.count({ where: { branchId } }),
      this.prisma.member.count({
        where: { branchId, createdAt: { gte: monthStart } },
      }),
      this.prisma.booking.count({
        where: {
          branchId,
          status: {
            notIn: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
          },
        },
      }),
      this.prisma.billing.count({
        where: {
          booking: { branchId },
          status: { in: [BillingStatus.PENDING, BillingStatus.PARTIAL_PAYMENT] },
        },
      }),
      this.prisma.billing.count({
        where: {
          booking: { branchId },
          status: BillingStatus.COMPLETED,
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

  async getAdminMemberActivity(branchId: string) {
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

  async getAdminBookingActivity(branchId: string) {
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

  async getAdminBillingActivity(branchId: string) {
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

  // ─── User / Mobile ────────────────────────────────────────────────────────

  async getUserDashboard(userId: string, memberRole: string, branchId: string) {
    const downlineRoles = this.getDownlineRoles(memberRole as Role);

    const [totalNetwork, activeMembers, availableProperties, unreadNotifications] =
      await Promise.all([
        this.prisma.member.count({
          where: {
            branchId,
            role: downlineRoles.length > 0 ? { in: downlineRoles } : undefined,
          },
        }),
        this.prisma.member.count({
          where: {
            branchId,
            status: UserStatus.ACTIVE,
            role: downlineRoles.length > 0 ? { in: downlineRoles } : undefined,
          },
        }),
        this.prisma.property.count({
          where: { workflowStatus: WorkflowStatus.AVAILABLE },
        }),
        memberRole === Role.DIRECTOR
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

  async getUserAlerts(memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { role: true, branchId: true },
    });

    if (!member) return [];

    const downlineRoles = this.getDownlineRoles(member.role);

    // Find bookings in the member's network (same branch, relevant roles)
    const networkWhere =
      downlineRoles.length > 0
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
          status: BookingStatus.FINAL_SETTLEMENT_PENDING,
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
          status: BookingStatus.REGISTRATION_PENDING,
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

    const alerts: Array<{
      type: string;
      title: string;
      description: string;
      relatedId: string;
    }> = [];

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

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private getDownlineRoles(role: Role): Role[] {
    const hierarchy: Record<string, Role[]> = {
      [Role.DIRECTOR]: [
        Role.EXECUTIVE_DIRECTOR,
        Role.DEPUTY_DIRECTOR,
        Role.SENIOR_MANAGER,
        Role.BUSINESS_MANAGER,
        Role.AGENT,
      ],
      [Role.EXECUTIVE_DIRECTOR]: [
        Role.DEPUTY_DIRECTOR,
        Role.SENIOR_MANAGER,
        Role.BUSINESS_MANAGER,
        Role.AGENT,
      ],
      [Role.DEPUTY_DIRECTOR]: [
        Role.SENIOR_MANAGER,
        Role.BUSINESS_MANAGER,
        Role.AGENT,
      ],
      [Role.SENIOR_MANAGER]: [Role.BUSINESS_MANAGER, Role.AGENT],
      [Role.BUSINESS_MANAGER]: [Role.AGENT],
      [Role.AGENT]: [],
    };
    return hierarchy[role] ?? [];
  }
}
