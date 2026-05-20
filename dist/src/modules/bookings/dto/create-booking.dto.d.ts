import { PaymentMethod } from '@prisma/client';
export declare class PaymentDto {
    bankName?: string;
    favourOf?: string;
    chequeNumber?: string;
    chequeDate?: string;
    gpayReference?: string;
    cashAmount?: number;
    totalAmount: number;
    paymentMethod: PaymentMethod;
}
export declare class DenominationDto {
    denomination: number;
    count: number;
    amount: number;
}
export declare class CreateBookingDto {
    propertyId: string;
    applicantName: string;
    relation?: string;
    applicantAddress?: string;
    pinCode?: string;
    cellNumber: string;
    dateOfBirth?: string;
    weddingDay?: string;
    projectName: string;
    plotNumber: string;
    squareFeet?: number;
    bookingDate: string;
    edDdSmBmName?: string;
    referenceCode?: string;
    directorName?: string;
    signatureUrl?: string;
    branchId?: string;
    payments?: PaymentDto[];
    denominations?: DenominationDto[];
}
