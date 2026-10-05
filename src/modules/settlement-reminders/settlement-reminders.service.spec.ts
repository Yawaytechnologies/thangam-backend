import { BillingStatus, MessageType, Role, UserStatus } from '@prisma/client';
import { SettlementRemindersService } from './settlement-reminders.service';

const mockPrisma = {
  user: { findFirst: jest.fn() },
  billing: { findMany: jest.fn() },
  workflowHistory: { findFirst: jest.fn() },
  notificationMessage: { findFirst: jest.fn() },
};

const mockNotificationsService = {
  sendFinalSettlementReminderMessage: jest.fn(),
};

describe('SettlementRemindersService', () => {
  let service: SettlementRemindersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SettlementRemindersService(
      mockPrisma as any,
      mockNotificationsService as any,
    );
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'super-1' });
    mockPrisma.workflowHistory.findFirst.mockResolvedValue({
      createdAt: new Date('2026-08-28T00:00:00.000Z'),
    });
    mockPrisma.notificationMessage.findFirst.mockResolvedValue(null);
  });

  it('sends reminder during the last 5 days before final settlement due date', async () => {
    const now = new Date('2026-09-24T00:00:00.000Z');
    const updatedAt = new Date('2026-08-28T00:00:00.000Z');
    mockPrisma.billing.findMany.mockResolvedValue([
      {
        id: 'billing-1',
        billingId: 'STH-BILL-0001',
        bookingId: 'booking-1',
        buyerName: 'Rajesh Kumar',
        buyerPhone: '9876543210',
        totalBalance: 25000,
        updatedAt,
        booking: {
          id: 'booking-1',
          bookingId: 'STH-BK-0001',
          projectName: 'Green Valley',
          plotNumber: 'PLOT-101',
          branchId: 'branch-1',
        },
      },
    ]);

    await service.sendDueReminders(now);

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: { role: Role.SUPER_ADMIN, status: UserStatus.ACTIVE },
      select: { id: true },
    });
    expect(mockPrisma.billing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: BillingStatus.FINAL_SETTLEMENT,
          totalBalance: { gt: 0 },
        },
      }),
    );
    expect(mockPrisma.notificationMessage.findFirst).toHaveBeenCalledWith({
      where: {
        messageType: MessageType.SETTLEMENT_REMINDER,
        relatedModule: 'Billing',
        relatedEntityId: 'billing-1',
      },
      select: { id: true },
    });
    expect(mockPrisma.workflowHistory.findFirst).toHaveBeenCalledWith({
      where: {
        entityType: 'billing',
        entityId: 'billing-1',
        toStatus: BillingStatus.FINAL_SETTLEMENT,
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    expect(
      mockNotificationsService.sendFinalSettlementReminderMessage,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        senderId: 'super-1',
        customerMobile: '9876543210',
        balanceAmount: 25000,
        dueDate: new Date('2026-09-28T00:00:00.000Z'),
      }),
    );
  });

  it('does not send a duplicate reminder', async () => {
    mockPrisma.billing.findMany.mockResolvedValue([
      {
        id: 'billing-1',
        billingId: 'STH-BILL-0001',
        bookingId: 'booking-1',
        buyerName: 'Rajesh Kumar',
        buyerPhone: '9876543210',
        totalBalance: 25000,
        updatedAt: new Date('2026-08-28T00:00:00.000Z'),
        booking: null,
      },
    ]);
    mockPrisma.notificationMessage.findFirst.mockResolvedValue({
      id: 'message-1',
    });

    await service.sendDueReminders(new Date('2026-09-24T00:00:00.000Z'));

    expect(
      mockNotificationsService.sendFinalSettlementReminderMessage,
    ).not.toHaveBeenCalled();
  });
});
