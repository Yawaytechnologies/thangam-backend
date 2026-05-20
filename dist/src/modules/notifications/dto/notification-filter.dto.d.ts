import { NotificationType, NotificationStatus } from '@prisma/client';
export declare class NotificationFilterDto {
    search?: string;
    type?: NotificationType;
    status?: NotificationStatus;
    branchId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}
