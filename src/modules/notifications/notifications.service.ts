import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  NotificationStatus,
  Role,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

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
  recipientUserIds?: string[];
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

interface NotificationViewer {
  id: string;
  role: Role;
  admin?: { branchId: string | null } | null;
  member?: { branchId: string | null } | null;
}

@Injectable()
export class NotificationsService {
  private visibility(user: NotificationViewer): Prisma.NotificationWhereInput {
    if (user.role === Role.SUPER_ADMIN) return {};
    const branchId =
      user.role === Role.ADMIN ? user.admin?.branchId : user.member?.branchId;
    if (!branchId)
      throw new ForbiddenException('Your account has no assigned branch');
    return {
      OR: [{ branchId }, { branchId: null }],
      ...(user.role === Role.DIRECTOR
        ? {
            type: {
              in: [
                NotificationType.ADMIN_ACTIVITY,
                NotificationType.MEMBER_ACTIVITY,
                NotificationType.SYSTEM_ACTIVITY,
                NotificationType.TEAM_ACTIVITY,
              ],
            },
          }
        : {}),
    };
  }

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

      if (this.gateway) {
        const payload = {
          ...notification,
          status: NotificationStatus.UNREAD,
        };
        dto.recipientUserIds.forEach((userId) =>
          this.gateway!.emitToUser(userId, 'notification:new', payload),
        );
      }
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

    // Include explicitly targeted users (for example, the member's actual
    // Director resolved through the reportsToId hierarchy).
    payload.recipientUserIds?.forEach((userId) => recipientUserIds.add(userId));

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

    if (user.role === Role.SUPER_ADMIN && branchId)
      notificationWhere.branchId = branchId;

    // Build recipient where clause
    const recipientWhere: any = {
      userId: user.id,
      notification: { AND: [this.visibility(user), notificationWhere] },
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
              branch: { select: { id: true, name: true, branchCode: true } },
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

  async findLatest(user: NotificationViewer) {
    return this.prisma.notificationRecipient.findMany({
      where: { userId: user.id, notification: this.visibility(user) },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        notification: {
          include: {
            branch: { select: { id: true, name: true, branchCode: true } },
          },
        },
      },
    });
  }

  // ─── getUnreadCount ───────────────────────────────────────────────────────

  async getUnreadCount(user: NotificationViewer): Promise<number> {
    return this.prisma.notificationRecipient.count({
      where: {
        userId: user.id,
        notification: this.visibility(user),
        status: NotificationStatus.UNREAD,
      },
    });
  }

  // ─── findOne ──────────────────────────────────────────────────────────────

  async findOne(id: string, user: NotificationViewer) {
    const recipient = await this.prisma.notificationRecipient.findFirst({
      where: {
        notificationId: id,
        userId: user.id,
        notification: this.visibility(user),
      },
      include: {
        notification: {
          include: {
            branch: { select: { id: true, name: true, branchCode: true } },
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

  async markRead(notificationId: string, user: NotificationViewer) {
    const recipient = await this.prisma.notificationRecipient.findFirst({
      where: {
        notificationId,
        userId: user.id,
        notification: this.visibility(user),
      },
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

  async markAllRead(user: NotificationViewer) {
    const result = await this.prisma.notificationRecipient.updateMany({
      where: {
        userId: user.id,
        notification: this.visibility(user),
        status: NotificationStatus.UNREAD,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    return { updated: result.count };
  }

  async createAnnouncement(dto: CreateAnnouncementDto, sender: any) {
    const requestedIds = [...new Set(dto.recipientUserIds ?? [])];
    if (!dto.sendToAllDirectors && requestedIds.length === 0) {
      throw new BadRequestException(
        'Select at least one Director or choose all Directors',
      );
    }

    const adminBranchId =
      sender.role === Role.ADMIN ? sender.admin?.branchId : undefined;
    if (sender.role === Role.ADMIN && !adminBranchId) {
      throw new ForbiddenException('Admin branch is not available');
    }

    const effectiveBranchId = adminBranchId ?? dto.branchId;
    const directors = await this.prisma.user.findMany({
      where: {
        role: Role.DIRECTOR,
        status: 'ACTIVE',
        ...(dto.sendToAllDirectors ? {} : { id: { in: requestedIds } }),
        member: effectiveBranchId
          ? { is: { branchId: effectiveBranchId } }
          : { isNot: null },
      },
      select: {
        id: true,
        member: { select: { branchId: true } },
      },
    });

    if (!dto.sendToAllDirectors && directors.length !== requestedIds.length) {
      throw new ForbiddenException(
        'One or more selected Directors are outside your permitted scope',
      );
    }
    if (directors.length === 0) {
      throw new BadRequestException('No active Directors found');
    }

    const recipientUserIds = directors.map((director) => director.id);
    const announcement = await this.prisma.$transaction(async (tx) => {
      const notification = await tx.notification.create({
        data: {
          title: dto.title.trim(),
          message: dto.message.trim(),
          type: NotificationType.ADMIN_ACTIVITY,
          priority: dto.priority ?? 'NORMAL',
          triggeredById: sender.id,
          branchId: effectiveBranchId ?? null,
          relatedModule: 'DIRECTOR_ANNOUNCEMENT',
        },
      });

      await tx.notificationRecipient.createMany({
        data: recipientUserIds.map((userId) => ({
          notificationId: notification.id,
          userId,
          status: NotificationStatus.UNREAD,
        })),
      });
      return notification;
    });

    if (this.gateway) {
      const payload = {
        ...announcement,
        status: NotificationStatus.UNREAD,
      };
      recipientUserIds.forEach((userId) =>
        this.gateway!.emitToUser(userId, 'notification:new', payload),
      );
    }

    return {
      notification: announcement,
      recipientCount: recipientUserIds.length,
    };
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
