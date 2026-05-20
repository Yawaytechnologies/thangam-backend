export interface BookingPdfData {
    bookingId: string;
    bookingDate: string;
    applicantName: string;
    relation: string;
    applicantAddress: string;
    pinCode: string;
    cellNumber: string;
    dateOfBirth?: string;
    weddingDay?: string;
    projectName: string;
    plotNumber: string;
    squareFeet?: number;
    edDdSmBmName?: string;
    referenceCode?: string;
    directorName?: string;
    payments: Array<{
        paymentMethod: string;
        bankName?: string;
        chequeNumber?: string;
        gpayReference?: string;
        cashAmount?: number;
        totalAmount: number;
    }>;
    denominations: Array<{
        denomination: number;
        count: number;
        amount: number;
    }>;
    signatureUrl?: string;
}
export declare function buildBookingFormHtml(data: BookingPdfData): string;
