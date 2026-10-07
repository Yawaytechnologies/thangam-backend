import { existsSync } from 'node:fs';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as puppeteer from 'puppeteer-core';
import {
  buildBookingFormHtml,
  BookingPdfData,
} from './templates/booking-form.template';
import {
  buildEstimateCopyHtml,
  EstimatePdfData,
} from './templates/estimate-copy.template';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  private getExecutablePath() {
    const candidates = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      process.platform === 'win32'
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : '',
      process.platform === 'win32'
        ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
        : '',
      process.platform === 'linux' ? '/usr/bin/chromium-browser' : '',
      process.platform === 'linux' ? '/usr/bin/chromium' : '',
      process.platform === 'linux' ? '/usr/bin/google-chrome' : '',
      process.platform === 'linux' ? '/usr/bin/google-chrome-stable' : '',
    ].filter(Boolean) as string[];

    const executablePath = candidates.find((path) => existsSync(path));
    if (!executablePath) {
      throw new ServiceUnavailableException(
        'PDF download is unavailable because Chrome/Chromium is not installed on the server.',
      );
    }

    return executablePath;
  }

  private async getBrowser() {
    return puppeteer.launch({
      executablePath: this.getExecutablePath(),
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });
  }

  async generateBookingPdf(data: BookingPdfData): Promise<Buffer> {
    const browser = await this.getBrowser();
    try {
      const page = await browser.newPage();
      const html = buildBookingFormHtml(data);
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      });
      return Buffer.from(pdf);
    } catch (err) {
      this.logger.error('Booking PDF generation failed', err);
      throw err;
    } finally {
      await browser.close();
    }
  }

  async generateBillingPdf(data: EstimatePdfData): Promise<Buffer> {
    const browser = await this.getBrowser();
    try {
      const page = await browser.newPage();
      const html = buildEstimateCopyHtml(data);
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      });
      return Buffer.from(pdf);
    } catch (err) {
      this.logger.error('Billing PDF generation failed', err);
      throw err;
    } finally {
      await browser.close();
    }
  }

  async generateEstimatePdf(data: EstimatePdfData): Promise<Buffer> {
    return this.generateBillingPdf(data);
  }
}
