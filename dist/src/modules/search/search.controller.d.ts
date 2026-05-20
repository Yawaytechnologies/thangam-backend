import { SearchService } from './search.service';
export declare class SearchController {
    private readonly searchService;
    constructor(searchService: SearchService);
    globalSearch(query: string): Promise<{
        members: {
            id: string;
            phone: string;
            role: import("@prisma/client").$Enums.Role;
            status: import("@prisma/client").$Enums.UserStatus;
            createdAt: Date;
            branchId: string;
            fullName: string;
            memberId: string;
        }[];
        branches: {
            id: string;
            status: import("@prisma/client").$Enums.BranchStatus;
            createdAt: Date;
            name: string;
            city: string | null;
            branchCode: string;
        }[];
        admins: {
            id: string;
            email: string | null;
            phone: string;
            status: import("@prisma/client").$Enums.UserStatus;
            createdAt: Date;
            adminId: string;
            branchId: string;
            fullName: string;
        }[];
        properties: {
            id: string;
            createdAt: Date;
            propertyId: string;
            projectName: string;
            plotNumber: string;
            propertyName: string;
            propertyCode: string | null;
            workflowStatus: import("@prisma/client").$Enums.WorkflowStatus;
        }[];
        bookings: {
            id: string;
            status: import("@prisma/client").$Enums.BookingStatus;
            createdAt: Date;
            branchId: string;
            bookingId: string;
            applicantName: string;
            cellNumber: string;
            projectName: string;
            plotNumber: string;
            bookingDate: Date;
        }[];
        billing: {
            id: string;
            status: import("@prisma/client").$Enums.BillingStatus;
            createdAt: Date;
            billingId: string;
            buyerName: string;
            buyerPhone: string;
            amountInNumbers: number;
            totalBalance: number;
        }[];
        notifications: {
            id: string;
            createdAt: Date;
            type: import("@prisma/client").$Enums.NotificationType;
            title: string;
            relatedModule: string | null;
            relatedEntityId: string | null;
            message: string;
            priority: string;
        }[];
    }>;
}
