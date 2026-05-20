import { BranchStatus } from '@prisma/client';
export declare class BranchFilterDto {
    search?: string;
    status?: BranchStatus;
    page?: number;
    limit?: number;
}
