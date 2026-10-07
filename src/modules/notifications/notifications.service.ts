import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  Prisma,
  MessageType,
  NotificationType,
  NotificationStatus,
  Role,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SmsService } from '../sms/sms.service';

type NotificationPriority = 'HIGH' | 'MEDIUM' | 'LOW';

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
  private readonly logger = new Logger(NotificationsService.name);

  // Gateway is injected via setter to avoid circular dependency
  private gateway: {
    emitToUser(userId: string, event: string, data: any): void;
  } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly smsService?: SmsService,
  ) {}

  setGateway(gateway: {
    emitToUser(userId: string, event: string, data: any): void;
  }): void {
    this.gateway = gateway;
  }

  private visibility(user: NotificationViewer): Prisma.NotificationWhereInput {
    if (user.role === Role.SUPER_ADMIN)
      return {
        type: NotificationType.PROPERTY_ACTIVITY,
        triggeredById: { not: user.id },
        triggeredBy: { is: { role: Role.ADMIN } },
      };
    const branchId =
      user.role === Role.ADMIN ? user.admin?.branchId : user.member?.branchId;
    if (!branchId)
      throw new ForbiddenException('Your account has no assigned branch');

    if (user.role === Role.ADMIN) {
      return {
        OR: [{ branchId }, { branchId: null }],
        type: NotificationType.PROPERTY_ACTIVITY,
        triggeredBy: { is: { role: Role.SUPER_ADMIN } },
      };
    }

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

  private resolvePriority(
    payload: Pick<
      CreateNotificationDto,
      'title' | 'message' | 'type' | 'priority' | 'relatedModule'
    >,
  ): NotificationPriority {
    const explicitPriority = String(payload.priority ?? '')
      .trim()
      .toUpperCase();
    if (
      explicitPriority === 'HIGH' ||
      explicitPriority === 'MEDIUM' ||
      explicitPriority === 'LOW'
    ) {
      return explicitPriority;
    }

    const text =
      `${payload.title} ${payload.message} ${payload.type} ${payload.relatedModule ?? ''}`.toLowerCase();
    const highPrioritySignals = [
      'delete',
      'deleted',
      'deletion',
      'remove',
      'removed',
      'deactivate',
      'deactivated',
      'deactivation',
      'reject',
      'rejected',
      'rejection',
      'cancel',
      'cancelled',
      'canceled',
      'cancellation',
      'overdue',
      'payment due',
      'past due',
      'refund',
      'refunded',
      'security',
      'unauthorized',
      'suspicious',
    ];
    const mediumPrioritySignals = [
      'create',
      'created',
      'creation',
      'approve',
      'approved',
      'approval',
      'role change',
      'role changed',
      'role updated',
      'important',
      'critical update',
      'major update',
    ];

    if (highPrioritySignals.some((signal) => text.includes(signal))) {
      return 'HIGH';
    }
    if (mediumPrioritySignals.some((signal) => text.includes(signal))) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  // ─── Backward-compat wrapper ──────────────────────────────────────────────

  async createNotification(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        title: dto.title,
        message: dto.message,
        type: dto.type,
        priority: this.resolvePriority(dto),
        relatedModule: dto.relatedModule ?? null,
        relatedEntityId: dto.relatedEntityId ?? null,
        triggeredById: dto.triggeredById ?? null,
        branchId: dto.branchId ?? null,
        propertyId: dto.propertyId ?? null,
        bookingId: dto.bookingId ?? null,
        billingId: dto.billingId ?? null,
      },
    });

    const recipientUserIds = await this.resolveRecipientUserIds(dto);

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

    this.emitNotification(notification, recipientUserIds);

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
        priority: this.resolvePriority(payload),
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
    const recipientUserIds = await this.resolveRecipientUserIds(payload);

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
    this.emitNotification(notification, recipientUserIds);
  }

  private async resolveRecipientUserIds(
    payload: CreateNotificationDto | DispatchPayload,
  ) {
    const recipientUserIds = new Set<string>(
      'recipientUserIds' in payload ? (payload.recipientUserIds ?? []) : [],
    );

    // Always include all SUPER_ADMIN users
    const superAdmins = await this.prisma.user.findMany({
      where: { role: Role.SUPER_ADMIN, status: 'ACTIVE' },
      select: { id: true },
    });
    const actor = payload.triggeredById
      ? await this.prisma.user.findUnique({
          where: { id: payload.triggeredById },
          select: { role: true },
        })
      : null;
    const notifySuperAdmins =
      actor?.role === Role.ADMIN &&
      payload.type === NotificationType.PROPERTY_ACTIVITY;
    superAdmins.forEach((u) => {
      if (notifySuperAdmins && u.id !== payload.triggeredById)
        recipientUserIds.add(u.id);
      else recipientUserIds.delete(u.id);
    });

    // Property updates are sent from Super Admins only to the affected branch.
    if (
      payload.branchId &&
      payload.type === NotificationType.PROPERTY_ACTIVITY &&
      actor?.role === Role.SUPER_ADMIN
    ) {
      const branchAdmins = await this.prisma.admin.findMany({
        where: {
          branchId: payload.branchId,
          user: { status: 'ACTIVE' },
        },
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

    return recipientUserIds;
  }

  private emitNotification(
    notification: {
      id: string;
      title: string;
      message: string;
      type: NotificationType;
      priority: string;
      createdAt: Date;
      relatedModule: string | null;
      relatedEntityId: string | null;
    },
    recipientUserIds: Set<string>,
  ) {
    if (!this.gateway) return;

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
      this.gateway!.emitToUser(userId, 'notification:new', notificationPayload);
    });
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

    if (branchId) notificationWhere.branchId = branchId;

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

  async findLatest(user: any) {
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

  async getUnreadCount(user: any): Promise<number> {
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

  async remove(recipientId: string, user: NotificationViewer) {
    const result = await this.prisma.notificationRecipient.deleteMany({
      where: {
        id: recipientId,
        userId: user.id,
        notification: this.visibility(user),
      },
    });
    if (!result.count) throw new NotFoundException('Notification not found');
    return { deleted: true };
  }

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

  async deleteForUser(notificationId: string, user: NotificationViewer) {
    const recipient = await this.prisma.notificationRecipient.findFirst({
      where: {
        notificationId,
        userId: user.id,
        notification: this.visibility(user),
      },
      select: { id: true },
    });

    if (!recipient) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notificationRecipient.delete({
      where: { id: recipient.id },
    });

    return { deleted: true };
  }

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

  async sendBookingCustomerMessage(payload: {
    senderId: string;
    customerName: string;
    customerMobile: string;
    branchId?: string | null;
    bookingId: string;
    bookingNumber: string;
    projectName: string;
    plotNumber: string;
  }) {
    const smsText = `Dear ${payload.customerName}, your property booking ${payload.bookingNumber} for ${payload.projectName} Plot ${payload.plotNumber} has been confirmed. Thank you, Sri Thangam Housing.`;
    const body = [`To: ${payload.customerMobile}`, smsText].join('\n');

    const notificationMessage = await this.prisma.notificationMessage.create({
      data: {
        senderId: payload.senderId,
        recipientName: payload.customerName,
        recipientRole: 'CUSTOMER',
        branchId: payload.branchId ?? null,
        messageType: MessageType.BOOKING_FOLLOW_UP,
        subject: `Property booking confirmed - ${payload.bookingNumber}`,
        body,
        relatedModule: 'Bookings',
        relatedEntityId: payload.bookingId,
      },
    });

    // Delivery is queued transactionally by the booking/billing service.

    return notificationMessage;
  }

  async sendBillingCustomerMessage(payload: {
    senderId: string;
    customerName: string;
    customerMobile: string;
    branchId?: string | null;
    bookingId: string;
    bookingNumber: string;
    billingId: string;
    billingNumber: string;
    projectName: string;
    plotNumber: string;
    amountReceived: number;
    totalBalance: number;
  }) {
    const smsText = `Dear ${payload.customerName}, payment of Rs.${payload.amountReceived} for booking ${payload.bookingNumber} (${payload.projectName} Plot ${payload.plotNumber}) has been recorded. Balance: Rs.${payload.totalBalance}. Thank you, Sri Thangam Housing.`;
    const body = [`To: ${payload.customerMobile}`, smsText].join('\n');

    const notificationMessage = await this.prisma.notificationMessage.create({
      data: {
        senderId: payload.senderId,
        recipientName: payload.customerName,
        recipientRole: 'CUSTOMER',
        branchId: payload.branchId ?? null,
        messageType: MessageType.BILLING_FOLLOW_UP,
        subject: `Payment received - ${payload.billingNumber}`,
        body,
        relatedModule: 'Billing',
        relatedEntityId: payload.billingId,
      },
    });

    // Delivery is queued transactionally by the booking/billing service.

    return notificationMessage;
  }

  async sendFinalSettlementReminderMessage(payload: {
    senderId: string;
    customerName: string;
    customerMobile: string;
    branchId?: string | null;
    bookingId: string;
    bookingNumber: string;
    billingId: string;
    billingNumber: string;
    projectName: string;
    plotNumber: string;
    balanceAmount: number;
    dueDate: Date;
  }) {
    const dueDateText = payload.dueDate.toISOString().split('T')[0];
    const smsText = `Dear ${payload.customerName}, reminder: final settlement balance Rs.${payload.balanceAmount} for booking ${payload.bookingNumber} (${payload.projectName} Plot ${payload.plotNumber}) is due by ${dueDateText}. Please pay before the due date. Sri Thangam Housing.`;
    const body = [`To: ${payload.customerMobile}`, smsText].join('\n');

    const notificationMessage = await this.prisma.notificationMessage.create({
      data: {
        senderId: payload.senderId,
        recipientName: payload.customerName,
        recipientRole: 'CUSTOMER',
        branchId: payload.branchId ?? null,
        messageType: MessageType.SETTLEMENT_REMINDER,
        subject: `Final settlement reminder - ${payload.billingNumber}`,
        body,
        relatedModule: 'Billing',
        relatedEntityId: payload.billingId,
      },
    });

    await this.sendCustomerSms(payload.customerMobile, smsText);

    return notificationMessage;
  }

  private async sendCustomerSms(phoneNumber: string, message: string) {
    if (!this.smsService) return;

    try {
      const result = await this.smsService.sendSms(phoneNumber, message);
      if (result.skipped) {
        this.logger.warn(
          `Customer SMS skipped: ${result.message ?? 'No reason provided'}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Customer SMS failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
