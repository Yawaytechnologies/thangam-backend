export interface EstimatePdfData {
    billingId: string;
    bookingId: string;
    billingDate: string;
    orderNumber?: string;
    billingNumber?: string;
    buyerName: string;
    buyerAddress?: string;
    buyerPhone: string;
    projectName: string;
    plotNumber: string;
    squareFeet?: number;
    bookingStatus: string;
    paymentMethod: string;
    amountInNumbers: number;
    amountInWords: string;
    totalReceived: number;
    totalBalance: number;
    operationalNotes?: string;
    settlementNotes?: string;
    termsConditions?: string;
    signatureUrl?: string;
}
export declare function buildEstimateCopyHtml(data: EstimatePdfData): string;
