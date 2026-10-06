import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type BookingRecipient = {
  id: string;
  bookingId: string;
  cellNumber: string;
  applicantName: string;
  projectName: string;
  plotNumber: string;
};

@Injectable()
export class SmsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SmsService.name);
  private timer?: ReturnType<typeof setInterval>;
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private enabled() {
    return this.config.get<string>('SMS_ENABLED') === 'true';
  }

  onModuleInit() {
    if (!this.enabled()) return;
    this.timer = setInterval(() => {
      void this.processQueue();
    }, 10000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private phone(value: string): string {
    const digits = value.replace(/\D/g, '');
    const local =
      digits.length === 12 && digits.startsWith('91')
        ? digits.slice(2)
        : digits;
    if (!/^[6-9]\d{9}$/.test(local))
      throw new Error('Invalid customer mobile number');
    return local;
  }

  async booking(
    tx: Prisma.TransactionClient,
    booking: BookingRecipient,
    status: string,
  ) {
    await this.queue(
      tx,
      booking,
      `booking:${booking.id}:${status}`,
      `Dear ${booking.applicantName}, your booking ${booking.bookingId} for ${booking.projectName}, plot ${booking.plotNumber} is ${status.replace(/_/g, ' ')}. Sri Thangam Housing.`,
    );
  }

  async payment(
    tx: Prisma.TransactionClient,
    booking: BookingRecipient,
    billing: { id: string; totalReceived: number; totalBalance: number },
  ) {
    if (billing.totalReceived <= 0) return;
    await this.queue(
      tx,
      booking,
      `payment:${billing.id}`,
      `Dear ${booking.applicantName}, payment of Rs.${billing.totalReceived} received for booking ${booking.bookingId}. Balance: Rs.${billing.totalBalance}. Sri Thangam Housing.`,
    );
  }

  private async queue(
    tx: Prisma.TransactionClient,
    booking: BookingRecipient,
    eventKey: string,
    body: string,
  ) {
    if (!this.enabled()) return;
    await tx.smsMessage.upsert({
      where: { eventKey },
      create: {
        eventKey,
        bookingId: booking.id,
        recipient: this.phone(booking.cellNumber),
        body,
      },
      update: {},
    });
  }

  async sendSms(
    phoneNumber: string,
    message: string,
  ): Promise<{ skipped: boolean; message?: string; providerId?: string }> {
    if (!this.enabled()) return { skipped: true, message: 'SMS is disabled' };
    const recipient = this.phone(phoneNumber);
    const provider =
      this.config.get<string>('sms.provider') ||
      this.config.get<string>('SMS_PROVIDER');
    let response: Response;
    if (provider === 'twilio') {
      const sid = this.config.get<string>('TWILIO_ACCOUNT_SID');
      const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
      const from = this.config.get<string>('TWILIO_FROM_NUMBER');
      const service = this.config.get<string>('TWILIO_MESSAGING_SERVICE_SID');
      if (!sid || !token || (!from && !service))
        throw new Error('Twilio configuration is incomplete');
      const body = new URLSearchParams({
        To: `+91${recipient}`,
        Body: message,
      });
      if (service) body.set('MessagingServiceSid', service);
      else body.set('From', from!);
      response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
          signal: AbortSignal.timeout(15000),
        },
      );
    } else if (provider === 'fast2sms') {
      const key =
        this.config.get<string>('sms.fast2sms.apiKey') ||
        this.config.get<string>('FAST2SMS_API_KEY');
      if (!key) throw new Error('Fast2SMS configuration is incomplete');
      response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: { authorization: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ route: 'q', numbers: recipient, message }),
        signal: AbortSignal.timeout(15000),
      });
    } else throw new Error('SMS provider is not configured');
    if (!response.ok)
      throw new Error(`SMS provider rejected request (${response.status})`);
    const result = (await response.json()) as {
      sid?: string;
      request_id?: string;
      return?: boolean;
    };
    const providerId =
      provider === 'twilio'
        ? result.sid
        : result.return === true
          ? result.request_id
          : undefined;
    if (!providerId)
      throw new Error('SMS provider did not acknowledge submission');
    return { skipped: false, providerId };
  }

  async processQueue() {
    if (!this.enabled() || this.processing) return;
    this.processing = true;
    try {
      const messages = await this.prisma.smsMessage.findMany({
        where: { status: 'PENDING', nextAttemptAt: { lte: new Date() } },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });
      for (const message of messages) {
        const claim = await this.prisma.smsMessage.updateMany({
          where: { id: message.id, status: 'PENDING' },
          data: { status: 'PROCESSING', attempts: { increment: 1 } },
        });
        if (!claim.count) continue;
        try {
          const result = await this.sendSms(message.recipient, message.body);
          await this.prisma.smsMessage.update({
            where: { id: message.id },
            data: {
              status: result.skipped ? 'PENDING' : 'SUBMITTED',
              providerId: result.providerId,
            },
          });
        } catch {
          // A timeout may occur after acceptance: do not automatically resend.
          await this.prisma.smsMessage.update({
            where: { id: message.id },
            data: { status: 'UNKNOWN', errorCode: 'SUBMISSION_UNCONFIRMED' },
          });
        }
      }
    } catch {
      this.logger.error('Unable to process SMS outbox');
    } finally {
      this.processing = false;
    }
  }
}
