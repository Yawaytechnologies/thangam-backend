import { UserStatus } from '@prisma/client';
export declare class AdminFilterDto {
    search?: string;
    branchId?: string;
    status?: UserStatus;
    page?: number;
    limit?: number;
}
