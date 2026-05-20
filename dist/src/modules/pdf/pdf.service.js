"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var PdfService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfService = void 0;
const common_1 = require("@nestjs/common");
const puppeteer = __importStar(require("puppeteer-core"));
const booking_form_template_1 = require("./templates/booking-form.template");
const estimate_copy_template_1 = require("./templates/estimate-copy.template");
let PdfService = PdfService_1 = class PdfService {
    logger = new common_1.Logger(PdfService_1.name);
    async getBrowser() {
        return puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ||
                (process.platform === 'win32'
                    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
                    : '/usr/bin/chromium-browser'),
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
        });
    }
    async generateBookingPdf(data) {
        const browser = await this.getBrowser();
        try {
            const page = await browser.newPage();
            const html = (0, booking_form_template_1.buildBookingFormHtml)(data);
            await page.setContent(html, { waitUntil: 'load' });
            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
            });
            return Buffer.from(pdf);
        }
        catch (err) {
            this.logger.error('Booking PDF generation failed', err);
            throw err;
        }
        finally {
            await browser.close();
        }
    }
    async generateBillingPdf(data) {
        const browser = await this.getBrowser();
        try {
            const page = await browser.newPage();
            const html = (0, estimate_copy_template_1.buildEstimateCopyHtml)(data);
            await page.setContent(html, { waitUntil: 'load' });
            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
            });
            return Buffer.from(pdf);
        }
        catch (err) {
            this.logger.error('Billing PDF generation failed', err);
            throw err;
        }
        finally {
            await browser.close();
        }
    }
    async generateEstimatePdf(data) {
        return this.generateBillingPdf(data);
    }
};
exports.PdfService = PdfService;
exports.PdfService = PdfService = PdfService_1 = __decorate([
    (0, common_1.Injectable)()
], PdfService);
//# sourceMappingURL=pdf.service.js.map