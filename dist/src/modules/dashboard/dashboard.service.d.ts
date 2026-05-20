import { PrismaService } from '../../prisma/prisma.service';
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getSuperAdminStats(): Promise<{
        totalMembers: number;
        membersToday: number;
        membersThisWeek: number;
        membersThisMonth: number;
        totalDirectors: number;
        activeMembers: number;
        totalBranches: number;
        totalProperties: number;
        activeBookings: number;
        totalAdmins: number;
    }>;
    getAdminStats(branchId: string): Promise<{
        totalMembers: number;
        newMembersThisMonth: number;
        activeBookings: number;
        pendingBilling: number;
        completedSettlements: number;
    }>;
    getAdminMemberActivity(branchId: string): Promise<{
        id: string;
        role: import("@prisma/client").$Enums.Role;
        status: import("@prisma/client").$Enums.UserStatus;
        createdAt: Date;
        fullName: string;
        memberId: string;
    }[]>;
    getAdminBookingActivity(branchId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.BookingStatus;
        bookingId: string;
        applicantName: string;
        projectName: string;
        plotNumber: string;
        bookingDate: Date;
    }[]>;
    getAdminBillingActivity(branchId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.BillingStatus;
        billingId: string;
        buyerName: string;
        amountInNumbers: number;
        totalBalance: number;
    }[]>;
    getUserDashboard(userId: string, memberRole: string, branchId: string): Promise<{
        totalNetwork: number;
        activeMembers: number;
        availableProperties: number;
        unreadNotifications: number;
    }>;
    getUserAlerts(memberId: string): Promise<{
        type: string;
        title: string;
        description: string;
        relatedId: string;
    }[]>;
    private getDownlineRoles;
}
