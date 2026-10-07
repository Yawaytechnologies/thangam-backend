import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationStatus, NotificationType, Role } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  notificationRecipient: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  notification: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  user: { findMany: jest.fn(), findUnique: jest.fn() },
  admin: { findMany: jest.fn() },
  notificationMessage: { create: jest.fn() },
  $transaction: jest.fn(),
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
    mockPrisma.$transaction.mockImplementation((callback) =>
      callback(mockPrisma),
    );
  });

  describe('property activity recipients', () => {
    const notification = {
      id: 'property-notification',
      title: 'Property Activity',
      message: 'Property A was updated.',
      type: NotificationType.PROPERTY_ACTIVITY,
      priority: 'LOW',
      createdAt: new Date(),
      relatedModule: 'properties',
      relatedEntityId: 'property-1',
    };

    beforeEach(() => {
      mockPrisma.notification.create.mockResolvedValue(notification);
      mockPrisma.notificationRecipient.createMany.mockResolvedValue({
        count: 1,
      });
    });

    it('sends Admin property changes to active Super Admins only', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'super-admin-1' }]);
      mockPrisma.user.findUnique.mockResolvedValue({ role: Role.ADMIN });

      await service.dispatch({
        title: notification.title,
        message: notification.message,
        type: NotificationType.PROPERTY_ACTIVITY,
        triggeredById: 'admin-1',
        branchId: 'branch-1',
        propertyId: 'property-1',
      });

      expect(mockPrisma.notificationRecipient.createMany).toHaveBeenCalledWith({
        data: [
          {
            notificationId: notification.id,
            userId: 'super-admin-1',
            status: NotificationStatus.UNREAD,
          },
        ],
        skipDuplicates: true,
      });
      expect(mockPrisma.admin.findMany).not.toHaveBeenCalled();
    });

    it('sends Super Admin property changes only to active Admins in that branch', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue({
        role: Role.SUPER_ADMIN,
      });
      mockPrisma.admin.findMany.mockResolvedValue([{ userId: 'branch-admin' }]);

      await service.dispatch({
        title: notification.title,
        message: notification.message,
        type: NotificationType.PROPERTY_ACTIVITY,
        triggeredById: 'super-admin-1',
        branchId: 'branch-1',
        propertyId: 'property-1',
      });

      expect(mockPrisma.admin.findMany).toHaveBeenCalledWith({
        where: {
          branchId: 'branch-1',
          user: { status: 'ACTIVE' },
        },
        select: { userId: true },
      });
      expect(mockPrisma.notificationRecipient.createMany).toHaveBeenCalledWith({
        data: [
          {
            notificationId: notification.id,
            userId: 'branch-admin',
            status: NotificationStatus.UNREAD,
          },
        ],
        skipDuplicates: true,
      });
    });
  });

  describe('Admin and Superadmin property-only inboxes', () => {
    const user = { id: 'superadmin', role: Role.SUPER_ADMIN };
    it('restricts notifications to Admin property activity and excludes self', async () => {
      await service.findLatest(user);
      expect(mockPrisma.notificationRecipient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: user.id,
            notification: {
              type: NotificationType.PROPERTY_ACTIVITY,
              triggeredById: { not: user.id },
              triggeredBy: { is: { role: Role.ADMIN } },
            },
          },
        }),
      );
    });
    it('deletes only the visible recipient record from the current user inbox', async () => {
      mockPrisma.notificationRecipient.deleteMany.mockResolvedValue({
        count: 1,
      });
      await expect(service.remove('recipient-1', user)).resolves.toEqual({
        deleted: true,
      });
      expect(mockPrisma.notificationRecipient.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'recipient-1',
          userId: user.id,
          notification: {
            type: NotificationType.PROPERTY_ACTIVITY,
            triggeredById: { not: user.id },
            triggeredBy: { is: { role: Role.ADMIN } },
          },
        },
      });
    });
    it('rejects deletion of inaccessible or missing notifications', async () => {
      mockPrisma.notificationRecipient.deleteMany.mockResolvedValue({
        count: 0,
      });
      await expect(
        service.remove('someone-elses-recipient', user),
      ).rejects.toThrow(NotFoundException);
    });

    it('restricts Admin notifications to Super Admin property activity in their branch', async () => {
      const admin = {
        id: 'admin-1',
        role: Role.ADMIN,
        admin: { branchId: 'branch-1' },
      };

      await service.findLatest(admin);

      expect(mockPrisma.notificationRecipient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: admin.id,
            notification: {
              OR: [{ branchId: 'branch-1' }, { branchId: null }],
              type: NotificationType.PROPERTY_ACTIVITY,
              triggeredBy: { is: { role: Role.SUPER_ADMIN } },
            },
          },
        }),
      );
    });
  });

  describe('visibility consistency', () => {
    const director = {
      id: 'director',
      role: Role.DIRECTOR,
      member: { branchId: 'branch-a' },
    };

    it('uses the same scope for the list, latest, unread count and read actions', async () => {
      mockPrisma.$transaction.mockImplementation((queries) =>
        Promise.all(queries),
      );
      mockPrisma.notificationRecipient.findMany.mockResolvedValue([]);
      mockPrisma.notificationRecipient.count.mockResolvedValue(0);
      mockPrisma.notificationRecipient.findFirst.mockResolvedValue(null);
      mockPrisma.notificationRecipient.updateMany.mockResolvedValue({
        count: 0,
      });
      await service.findAll(director, {});
      const scope =
        mockPrisma.notificationRecipient.findMany.mock.calls[0][0].where
          .notification.AND[0];
      expect(scope.OR).toEqual([{ branchId: 'branch-a' }, { branchId: null }]);
      expect(scope.type.in).not.toContain(NotificationType.BILLING_ACTIVITY);
      expect(scope.type.in).toContain(NotificationType.ADMIN_ACTIVITY);
      await service.findLatest(director);
      expect(
        mockPrisma.notificationRecipient.findMany,
      ).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { userId: director.id, notification: scope },
        }),
      );
      await service.getUnreadCount(director);
      expect(mockPrisma.notificationRecipient.count).toHaveBeenLastCalledWith({
        where: { userId: director.id, notification: scope, status: 'UNREAD' },
      });
      await expect(service.markRead('hidden', director)).rejects.toThrow(
        NotFoundException,
      );
      expect(
        mockPrisma.notificationRecipient.findFirst,
      ).toHaveBeenLastCalledWith({
        where: {
          notificationId: 'hidden',
          userId: director.id,
          notification: scope,
        },
      });
      await service.markAllRead(director);
      expect(
        mockPrisma.notificationRecipient.updateMany,
      ).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { userId: director.id, notification: scope, status: 'UNREAD' },
        }),
      );
    });

    it('intersects the selected type with Director permissions instead of replacing it', async () => {
      mockPrisma.$transaction.mockImplementation((queries) =>
        Promise.all(queries),
      );
      mockPrisma.notificationRecipient.findMany.mockResolvedValue([]);
      mockPrisma.notificationRecipient.count.mockResolvedValue(0);
      await service.findAll(director, {
        type: NotificationType.MEMBER_ACTIVITY,
      });
      const where =
        mockPrisma.notificationRecipient.findMany.mock.calls[0][0].where;
      expect(where.userId).toBe(director.id);
      expect(where.notification.AND[1]).toEqual({
        type: NotificationType.MEMBER_ACTIVITY,
      });
    });

    it('does not broaden access when an Admin has no assigned branch', async () => {
      await expect(
        service.getUnreadCount({ id: 'admin', role: Role.ADMIN }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.notificationRecipient.count).not.toHaveBeenCalled();
    });
  });

  describe('createAnnouncement', () => {
    const dto = {
      title: 'Director meeting',
      message: 'Please attend the monthly meeting.',
      recipientUserIds: ['11111111-1111-4111-8111-111111111111'],
    };
    const admin = {
      id: 'admin-user',
      role: Role.ADMIN,
      admin: { branchId: 'branch-1' },
    };

    it('creates an unread recipient for a Director in the Admin branch', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: dto.recipientUserIds[0],
          member: { branchId: 'branch-1' },
        },
      ]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notification-1',
        title: dto.title,
        message: dto.message,
        type: NotificationType.ADMIN_ACTIVITY,
      });
      mockPrisma.notificationRecipient.createMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.createAnnouncement(dto, admin);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: Role.DIRECTOR,
            member: { is: { branchId: 'branch-1' } },
          }),
        }),
      );
      expect(mockPrisma.notificationRecipient.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            notificationId: 'notification-1',
            userId: dto.recipientUserIds[0],
            status: NotificationStatus.UNREAD,
          }),
        ],
      });
      expect(result.recipientCount).toBe(1);
    });

    it('rejects a selected Director outside the Admin branch', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await expect(service.createAnnouncement(dto, admin)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });
  });

  // ─── getUnreadCount ────────────────────────────────────────────────────────

  describe('getUnreadCount', () => {
    it('returns 0 when user has no unread notifications', async () => {
      mockPrisma.notificationRecipient.count.mockResolvedValue(0);
      expect(
        await service.getUnreadCount({ id: 'user-1', role: Role.SUPER_ADMIN }),
      ).toBe(0);
    });

    it('returns the correct unread count', async () => {
      mockPrisma.notificationRecipient.count.mockResolvedValue(7);
      expect(
        await service.getUnreadCount({ id: 'user-1', role: Role.SUPER_ADMIN }),
      ).toBe(7);
    });

    it('queries only UNREAD status for the given user', async () => {
      mockPrisma.notificationRecipient.count.mockResolvedValue(0);
      await service.getUnreadCount({ id: 'user-42', role: Role.SUPER_ADMIN });
      expect(mockPrisma.notificationRecipient.count).toHaveBeenCalledWith({
        where: {
          notification: expect.objectContaining({
            triggeredBy: { is: { role: Role.ADMIN } },
          }),
          userId: 'user-42',
          status: NotificationStatus.UNREAD,
        },
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

      const result = await service.findLatest({
        id: 'user-1',
        role: Role.SUPER_ADMIN,
      });

      expect(mockPrisma.notificationRecipient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            notification: expect.objectContaining({
              triggeredBy: { is: { role: Role.ADMIN } },
            }),
            userId: 'user-1',
          },
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
      await expect(
        service.markRead('notif-1', { id: 'user-1', role: Role.SUPER_ADMIN }),
      ).rejects.toThrow(NotFoundException);
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

      await service.markRead('notif-1', {
        id: 'user-1',
        role: Role.SUPER_ADMIN,
      });

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
      await service
        .markRead('notif-99', { id: 'user-55', role: Role.SUPER_ADMIN })
        .catch(() => {});
      expect(mockPrisma.notificationRecipient.findFirst).toHaveBeenCalledWith({
        where: {
          notification: expect.objectContaining({
            triggeredBy: { is: { role: Role.ADMIN } },
          }),
          notificationId: 'notif-99',
          userId: 'user-55',
        },
      });
    });
  });

  // ─── markAllRead ───────────────────────────────────────────────────────────

  describe('markAllRead', () => {
    it('updates all UNREAD notifications for the user', async () => {
      mockPrisma.notificationRecipient.updateMany.mockResolvedValue({
        count: 4,
      });
      const result = await service.markAllRead({
        id: 'user-1',
        role: Role.SUPER_ADMIN,
      });
      expect(mockPrisma.notificationRecipient.updateMany).toHaveBeenCalledWith({
        where: {
          notification: expect.objectContaining({
            triggeredBy: { is: { role: Role.ADMIN } },
          }),
          userId: 'user-1',
          status: NotificationStatus.UNREAD,
        },
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
      const result = await service.markAllRead({
        id: 'user-1',
        role: Role.SUPER_ADMIN,
      });
      expect(result).toEqual({ updated: 0 });
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('throws NotFoundException when notification not found for user', async () => {
      mockPrisma.notificationRecipient.findFirst.mockResolvedValue(null);
      await expect(
        service.findOne('notif-1', { id: 'user-1', role: Role.SUPER_ADMIN }),
      ).rejects.toThrow(NotFoundException);
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
      const result = await service.findOne('n1', {
        id: 'user-1',
        role: Role.SUPER_ADMIN,
      });
      expect(result).toBe(recipient);
    });
  });
});
