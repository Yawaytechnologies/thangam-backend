import { Role, UserStatus } from '@prisma/client';
export declare class MemberFilterDto {
    search?: string;
    role?: Role;
    status?: UserStatus;
    branchId?: string;
    page?: number;
    limit?: number;
}
