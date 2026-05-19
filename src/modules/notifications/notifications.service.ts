import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, NotificationStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { SendMessageDto } from './dto/send-message.dto';

export interface DispatchPayload {
  title: string;
  message: string;
  type: NotificationType;
  priority?: string;
  relatedModule?: string;
  relatedEntityId?: string;
  triggeredById?: string;
  branchId?: string;
  propertyId?: string;
  bookingId?: string;
  billingId?: string;
}

// Kept for backward compatibility with existing callers (e.g. AdminsService)
export interface CreateNotificationDto {
  title: string;
  message: string;
  type: NotificationType;
  triggeredById?: string;
  branchId?: string;
  propertyId?: string;
  bookingId?: string;
  billingId?: string;
  recipientUserIds?: string[];
  priority?: string;
  relatedModule?: string;
  relatedEntityId?: string;
}

@Injectable()
export class NotificationsService {
  // Gateway is injected via setter to avoid circular dependency
  private gateway: {
    emitToUser(userId: string, event: string, data: any): void;
  } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  setGateway(gateway: {
    emitToUser(userId: string, event: string, data: any): void;
  }): void {
    this.gateway = gateway;
  }

  // ─── Backward-compat wrapper ──────────────────────────────────────────────

  async createNotification(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        title: dto.title,
        message: dto.message,
        type: dto.type,
        priority: dto.priority ?? 'NORMAL',
        relatedModule: dto.relatedModule ?? null,
        relatedEntityId: dto.relatedEntityId ?? null,
        triggeredById: dto.triggeredById ?? null,
        branchId: dto.branchId ?? null,
        propertyId: dto.propertyId ?? null,
        bookingId: dto.bookingId ?? null,
        billingId: dto.billingId ?? null,
      },
    });

    if (dto.recipientUserIds && dto.recipientUserIds.length > 0) {
      await this.prisma.notificationRecipient.createMany({
        data: dto.recipientUserIds.map((userId) => ({
          notificationId: notification.id,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    return notification;
  }

  // ─── dispatch ─────────────────────────────────────────────────────────────

  async dispatch(payload: DispatchPayload): Promise<void> {
    // Step 1: Create the Notification record
    const notification = await this.prisma.notification.create({
      data: {
        title: payload.title,
        message: payload.message,
        type: payload.type,
        priority: payload.priority ?? 'NORMAL',
        relatedModule: payload.relatedModule ?? null,
        relatedEntityId: payload.relatedEntityId ?? null,
        triggeredById: payload.triggeredById ?? null,
        branchId: payload.branchId ?? null,
        propertyId: payload.propertyId ?? null,
        bookingId: payload.bookingId ?? null,
        billingId: payload.billingId ?? null,
      },
    });

    // Step 2: Resolve recipients
    const recipientUserIds = new Set<string>();

    // Always include all SUPER_ADMIN users
    const superAdmins = await this.prisma.user.findMany({
      where: { role: Role.SUPER_ADMIN, status: 'ACTIVE' },
      select: { id: true },
    });
    superAdmins.forEach((u) => recipientUserIds.add(u.id));

    // If branchId provided: include ADMIN users of that branch
    if (payload.branchId) {
      const branchAdmins = await this.prisma.admin.findMany({
        where: { branchId: payload.branchId },
        select: { userId: true },
      });
      branchAdmins.forEach((a) => recipientUserIds.add(a.userId));
    }

    // If bookingId or billingId provided: find Directors in that booking's branch
    if (payload.bookingId || payload.billingId) {
      let bookingBranchId: string | null = null;

      if (payload.bookingId) {
        const booking = await this.prisma.booking.findUnique({
          where: { id: payload.bookingId },
          select: { branchId: true },
        });
        bookingBranchId = booking?.branchId ?? null;
      } else if (payload.billingId) {
        const billing = await this.prisma.billing.findUnique({
          where: { id: payload.billingId },
          select: { booking: { select: { branchId: true } } },
        });
        bookingBranchId = billing?.booking?.branchId ?? null;
      }

      if (bookingBranchId) {
        const directors = await this.prisma.member.findMany({
          where: {
            branchId: bookingBranchId,
            role: Role.DIRECTOR,
            status: 'ACTIVE',
          },
          select: { userId: true },
        });
        directors.forEach((d) => recipientUserIds.add(d.userId));
      }
    }

    // Step 3: Create NotificationRecipient records
    if (recipientUserIds.size > 0) {
      await this.prisma.notificationRecipient.createMany({
        data: Array.from(recipientUserIds).map((userId) => ({
          notificationId: notification.id,
          userId,
          status: NotificationStatus.UNREAD,
        })),
        skipDuplicates: true,
      });
    }

    // Step 4: Emit socket event to each recipient
    if (this.gateway) {
      const notificationPayload = {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        createdAt: notification.createdAt,
        relatedModule: notification.relatedModule,
        relatedEntityId: notification.relatedEntityId,
      };
      recipientUserIds.forEach((userId) => {
        this.gateway!.emitToUser(
          userId,
          'notification:new',
          notificationPayload,
        );
      });
    }
  }

  // ─── Private: walk reportsTo chain to find first DIRECTOR ─────────────────

  private async findDirectorInChain(
    memberId: string,
  ): Promise<{ userId: string } | null> {
    const MAX_DEPTH = 10;
    let currentId: string | null = memberId;

    for (let depth = 0; depth < MAX_DEPTH && currentId; depth++) {
      const member = await this.prisma.member.findUnique({
        where: { id: currentId },
        select: { role: true, userId: true, reportsToId: true },
      });

      if (!member) break;

      if (member.role === Role.DIRECTOR) {
        return { userId: member.userId };
      }

      currentId = member.reportsToId ?? null;
    }

    return null;
  }

  // ─── findAll ──────────────────────────────────────────────────────────────

  async findAll(user: any, filters: NotificationFilterDto) {
    const {
      search,
      type,
      status,
      branchId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;
    const skip = (page - 1) * limit;

    // Build base notification where clause
    const notificationWhere: any = {};

    if (type) notificationWhere.type = type;
    if (startDate || endDate) {
      notificationWhere.createdAt = {};
      if (startDate) notificationWhere.createdAt.gte = new Date(startDate);
      if (endDate) notificationWhere.createdAt.lte = new Date(endDate);
    }
    if (search) {
      notificationWhere.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { bookingId: { contains: search, mode: 'insensitive' } },
        { billingId: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Apply role-scoped branch filtering on the notification
    if (user.role === Role.SUPER_ADMIN) {
      if (branchId) notificationWhere.branchId = branchId;
    } else if (user.role === Role.ADMIN) {
      notificationWhere.branchId = user.admin?.branchId;
    } else if (user.member?.role === Role.DIRECTOR) {
      // Director sees notifications linked to their network - filter by branchId of their branch
      notificationWhere.branchId = user.member?.branchId;
    }

    // Build recipient where clause
    const recipientWhere: any = {
      userId: user.id,
      notification: notificationWhere,
    };

    if (status) recipientWhere.status = status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notificationRecipient.findMany({
        where: recipientWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          notification: {
            include: {
              triggeredBy: {
                select: { id: true, role: true, email: true, phone: true },
              },
            },
          },
        },
      }),
      this.prisma.notificationRecipient.count({ where: recipientWhere }),
    ]);

    return { data, total, page, limit };
  }

  // ─── findLatest ───────────────────────────────────────────────────────────

  async findLatest(userId: string) {
    return this.prisma.notificationRecipient.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        notification: true,
      },
    });
  }

  // ─── getUnreadCount ───────────────────────────────────────────────────────

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notificationRecipient.count({
      where: {
        userId,
        status: NotificationStatus.UNREAD,
      },
    });
  }

  // ─── findOne ──────────────────────────────────────────────────────────────

  async findOne(id: string, userId: string) {
    const recipient = await this.prisma.notificationRecipient.findFirst({
      where: {
        notificationId: id,
        userId,
      },
      include: {
        notification: {
          include: {
            triggeredBy: {
              select: { id: true, role: true, email: true, phone: true },
            },
          },
        },
      },
    });

    if (!recipient) {
      throw new NotFoundException('Notification not found');
    }

    return recipient;
  }

  // ─── markRead ─────────────────────────────────────────────────────────────

  async markRead(notificationId: string, userId: string) {
    const recipient = await this.prisma.notificationRecipient.findFirst({
      where: { notificationId, userId },
    });

    if (!recipient) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notificationRecipient.update({
      where: { id: recipient.id },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  // ─── markAllRead ──────────────────────────────────────────────────────────

  async markAllRead(userId: string) {
    const result = await this.prisma.notificationRecipient.updateMany({
      where: {
        userId,
        status: NotificationStatus.UNREAD,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    return { updated: result.count };
  }

  // ─── sendMessage ──────────────────────────────────────────────────────────

  async sendMessage(dto: SendMessageDto, senderId: string) {
    // Verify the source notification exists
    const notification = await this.prisma.notification.findUnique({
      where: { id: dto.notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Source notification not found');
    }

    const notificationMessage = await this.prisma.notificationMessage.create({
      data: {
        senderId,
        recipientName: dto.recipientName,
        recipientRole: dto.recipientRole,
        branchId: dto.branchId ?? null,
        messageType: dto.messageType,
        subject: dto.subject,
        body: dto.body,
        relatedModule: dto.relatedModule ?? null,
        relatedEntityId: dto.relatedEntityId ?? null,
      },
    });

    return notificationMessage;
  }
}
