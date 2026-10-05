import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { BillingStatus, MessageType, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_WINDOW_DAYS = 5;

@Injectable()
export class SettlementRemindersService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(SettlementRemindersService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    void this.sendDueReminders();
    this.timer = setInterval(() => void this.sendDueReminders(), ONE_DAY_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async sendDueReminders(now = new Date()) {
    if (this.running) return;
    this.running = true;

    try {
      const sender = await this.prisma.user.findFirst({
        where: { role: Role.SUPER_ADMIN, status: UserStatus.ACTIVE },
        select: { id: true },
      });

      if (!sender) {
        this.logger.warn(
          'Skipping settlement reminders: no active SUPER_ADMIN sender found',
        );
        return;
      }

      const billings = await this.prisma.billing.findMany({
        where: {
          status: BillingStatus.FINAL_SETTLEMENT,
          totalBalance: { gt: 0 },
        },
        take: 500,
        include: {
          booking: {
            select: {
              id: true,
              bookingId: true,
              projectName: true,
              plotNumber: true,
              branchId: true,
            },
          },
        },
      });

      for (const billing of billings) {
        const finalSettlementStartedAt =
          await this.findFinalSettlementStartedAt(billing.id);
        const dueDate = this.addMonths(
          finalSettlementStartedAt ?? billing.updatedAt,
          1,
        );
        const reminderStartDate = this.addDays(dueDate, -REMINDER_WINDOW_DAYS);

        if (now < reminderStartDate || now > dueDate) continue;

        const alreadySent = await this.prisma.notificationMessage.findFirst({
          where: {
            messageType: MessageType.SETTLEMENT_REMINDER,
            relatedModule: 'Billing',
            relatedEntityId: billing.id,
          },
          select: { id: true },
        });

        if (alreadySent) continue;

        await this.notificationsService.sendFinalSettlementReminderMessage({
          senderId: sender.id,
          customerName: billing.buyerName,
          customerMobile: billing.buyerPhone,
          branchId: billing.booking?.branchId,
          bookingId: billing.bookingId,
          bookingNumber: billing.booking?.bookingId ?? billing.bookingId,
          billingId: billing.id,
          billingNumber: billing.billingId,
          projectName: billing.booking?.projectName ?? 'Property',
          plotNumber: billing.booking?.plotNumber ?? '',
          balanceAmount: billing.totalBalance,
          dueDate,
        });
      }
    } catch (error) {
      this.logger.warn(
        `Settlement reminder check failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      this.running = false;
    }
  }

  private addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * ONE_DAY_MS);
  }

  private addMonths(date: Date, months: number) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
  }

  private async findFinalSettlementStartedAt(billingId: string) {
    const workflowEntry = await this.prisma.workflowHistory.findFirst({
      where: {
        entityType: 'billing',
        entityId: billingId,
        toStatus: BillingStatus.FINAL_SETTLEMENT,
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return workflowEntry?.createdAt ?? null;
  }
}
