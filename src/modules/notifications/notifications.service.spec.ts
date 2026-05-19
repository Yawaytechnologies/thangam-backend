import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationStatus, NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  notificationRecipient: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  notification: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  user: { findMany: jest.fn() },
  notificationMessage: { create: jest.fn() },
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  // ─── getUnreadCount ────────────────────────────────────────────────────────

  describe('getUnreadCount', () => {
    it('returns 0 when user has no unread notifications', async () => {
      mockPrisma.notificationRecipient.count.mockResolvedValue(0);
      expect(await service.getUnreadCount('user-1')).toBe(0);
    });

    it('returns the correct unread count', async () => {
      mockPrisma.notificationRecipient.count.mockResolvedValue(7);
      expect(await service.getUnreadCount('user-1')).toBe(7);
    });

    it('queries only UNREAD status for the given user', async () => {
      mockPrisma.notificationRecipient.count.mockResolvedValue(0);
      await service.getUnreadCount('user-42');
      expect(mockPrisma.notificationRecipient.count).toHaveBeenCalledWith({
        where: { userId: 'user-42', status: NotificationStatus.UNREAD },
      });
    });
  });

  // ─── findLatest ────────────────────────────────────────────────────────────

  describe('findLatest', () => {
    it('returns at most 10 notifications ordered by newest first', async () => {
      const fakeRecipients = Array.from({ length: 10 }, (_, i) => ({
        id: `r${i}`,
      }));
      mockPrisma.notificationRecipient.findMany.mockResolvedValue(
        fakeRecipients,
      );

      const result = await service.findLatest('user-1');

      expect(mockPrisma.notificationRecipient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          take: 10,
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toHaveLength(10);
    });
  });

  // ─── markRead ─────────────────────────────────────────────────────────────

  describe('markRead', () => {
    it('throws NotFoundException when notification is not found for that user', async () => {
      mockPrisma.notificationRecipient.findFirst.mockResolvedValue(null);
      await expect(service.markRead('notif-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates status to READ and sets readAt', async () => {
      const recipient = {
        id: 'r1',
        notificationId: 'notif-1',
        userId: 'user-1',
      };
      mockPrisma.notificationRecipient.findFirst.mockResolvedValue(recipient);
      mockPrisma.notificationRecipient.update.mockResolvedValue({
        ...recipient,
        status: 'READ',
      });

      await service.markRead('notif-1', 'user-1');

      expect(mockPrisma.notificationRecipient.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: expect.objectContaining({
          status: NotificationStatus.READ,
          readAt: expect.any(Date),
        }),
      });
    });

    it('looks up recipient by notificationId and userId', async () => {
      mockPrisma.notificationRecipient.findFirst.mockResolvedValue(null);
      await service.markRead('notif-99', 'user-55').catch(() => {});
      expect(mockPrisma.notificationRecipient.findFirst).toHaveBeenCalledWith({
        where: { notificationId: 'notif-99', userId: 'user-55' },
      });
    });
  });

  // ─── markAllRead ───────────────────────────────────────────────────────────

  describe('markAllRead', () => {
    it('updates all UNREAD notifications for the user', async () => {
      mockPrisma.notificationRecipient.updateMany.mockResolvedValue({
        count: 4,
      });
      const result = await service.markAllRead('user-1');
      expect(mockPrisma.notificationRecipient.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: NotificationStatus.UNREAD },
        data: expect.objectContaining({
          status: NotificationStatus.READ,
          readAt: expect.any(Date),
        }),
      });
      expect(result).toEqual({ updated: 4 });
    });

    it('returns { updated: 0 } when all are already read', async () => {
      mockPrisma.notificationRecipient.updateMany.mockResolvedValue({
        count: 0,
      });
      const result = await service.markAllRead('user-1');
      expect(result).toEqual({ updated: 0 });
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('throws NotFoundException when notification not found for user', async () => {
      mockPrisma.notificationRecipient.findFirst.mockResolvedValue(null);
      await expect(service.findOne('notif-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the notification recipient with notification details', async () => {
      const recipient = {
        id: 'r1',
        notificationId: 'n1',
        userId: 'user-1',
        notification: {
          title: 'Test',
          message: 'Msg',
          type: NotificationType.BOOKING_ACTIVITY,
        },
      };
      mockPrisma.notificationRecipient.findFirst.mockResolvedValue(recipient);
      const result = await service.findOne('n1', 'user-1');
      expect(result).toBe(recipient);
    });
  });
});
