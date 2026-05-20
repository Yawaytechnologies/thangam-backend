import { BookingPdfData } from './templates/booking-form.template';
import { EstimatePdfData } from './templates/estimate-copy.template';
export declare class PdfService {
    private readonly logger;
    private getBrowser;
    generateBookingPdf(data: BookingPdfData): Promise<Buffer>;
    generateBillingPdf(data: EstimatePdfData): Promise<Buffer>;
    generateEstimatePdf(data: EstimatePdfData): Promise<Buffer>;
}
