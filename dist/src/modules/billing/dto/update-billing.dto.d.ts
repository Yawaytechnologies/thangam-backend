import { PaymentMethod, BillingStatus } from '@prisma/client';
export declare class UpdateBillingDto {
    paymentMethod?: PaymentMethod;
    amountInNumbers?: number;
    totalReceived?: number;
    operationalNotes?: string;
    settlementNotes?: string;
    termsConditions?: string;
    status?: BillingStatus;
}
