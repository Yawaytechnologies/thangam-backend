import { BillingStatus, PaymentMethod } from '@prisma/client';
export declare class BillingFilterDto {
    search?: string;
    status?: BillingStatus;
    paymentMethod?: PaymentMethod;
    branchId?: string;
    page?: number;
    limit?: number;
}
