import { PaymentMethod } from '@prisma/client';
export declare class CreateBillingDto {
    bookingId: string;
    buyerName: string;
    buyerAddress?: string;
    buyerPhone: string;
    orderNumber?: string;
    billingNumber?: string;
    billingDate: string;
    paymentMethod: PaymentMethod;
    amountInNumbers: number;
    totalReceived: number;
    totalBalance?: number;
    operationalNotes?: string;
    settlementNotes?: string;
    termsConditions?: string;
    signatureUrl?: string;
}
