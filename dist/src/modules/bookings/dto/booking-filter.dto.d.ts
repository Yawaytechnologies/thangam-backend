import { BookingStatus } from '@prisma/client';
export declare class BookingFilterDto {
    search?: string;
    status?: BookingStatus;
    propertyId?: string;
    branchId?: string;
    page?: number;
    limit?: number;
}
