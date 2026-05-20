import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
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
    getAdminStats(user: any): Promise<{
        totalMembers: number;
        newMembersThisMonth: number;
        activeBookings: number;
        pendingBilling: number;
        completedSettlements: number;
    }>;
    getAdminMemberActivity(user: any): Promise<{
        id: string;
        role: import("@prisma/client").$Enums.Role;
        status: import("@prisma/client").$Enums.UserStatus;
        createdAt: Date;
        fullName: string;
        memberId: string;
    }[]>;
    getAdminBookingActivity(user: any): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.BookingStatus;
        bookingId: string;
        applicantName: string;
        projectName: string;
        plotNumber: string;
        bookingDate: Date;
    }[]>;
    getAdminBillingActivity(user: any): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.BillingStatus;
        billingId: string;
        buyerName: string;
        amountInNumbers: number;
        totalBalance: number;
    }[]>;
    getUserDashboard(user: any): Promise<{
        totalNetwork: number;
        activeMembers: number;
        availableProperties: number;
        unreadNotifications: number;
    }>;
    getUserAlerts(user: any): Promise<{
        type: string;
        title: string;
        description: string;
        relatedId: string;
    }[]>;
}
