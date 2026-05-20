"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
let NotificationsService = class NotificationsService {
    prisma;
    gateway = null;
    constructor(prisma) {
        this.prisma = prisma;
    }
    setGateway(gateway) {
        this.gateway = gateway;
    }
    async createNotification(dto) {
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
    async dispatch(payload) {
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
        const recipientUserIds = new Set();
        const superAdmins = await this.prisma.user.findMany({
            where: { role: client_1.Role.SUPER_ADMIN, status: 'ACTIVE' },
            select: { id: true },
        });
        superAdmins.forEach((u) => recipientUserIds.add(u.id));
        if (payload.branchId) {
            const branchAdmins = await this.prisma.admin.findMany({
                where: { branchId: payload.branchId },
                select: { userId: true },
            });
            branchAdmins.forEach((a) => recipientUserIds.add(a.userId));
        }
        if (payload.bookingId || payload.billingId) {
            let bookingBranchId = null;
            if (payload.bookingId) {
                const booking = await this.prisma.booking.findUnique({
                    where: { id: payload.bookingId },
                    select: { branchId: true },
                });
                bookingBranchId = booking?.branchId ?? null;
            }
            else if (payload.billingId) {
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
                        role: client_1.Role.DIRECTOR,
                        status: 'ACTIVE',
                    },
                    select: { userId: true },
                });
                directors.forEach((d) => recipientUserIds.add(d.userId));
            }
        }
        if (recipientUserIds.size > 0) {
            await this.prisma.notificationRecipient.createMany({
                data: Array.from(recipientUserIds).map((userId) => ({
                    notificationId: notification.id,
                    userId,
                    status: client_1.NotificationStatus.UNREAD,
                })),
                skipDuplicates: true,
            });
        }
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
                this.gateway.emitToUser(userId, 'notification:new', notificationPayload);
            });
        }
    }
    async findDirectorInChain(memberId) {
        const MAX_DEPTH = 10;
        let currentId = memberId;
        for (let depth = 0; depth < MAX_DEPTH && currentId; depth++) {
            const member = await this.prisma.member.findUnique({
                where: { id: currentId },
                select: { role: true, userId: true, reportsToId: true },
            });
            if (!member)
                break;
            if (member.role === client_1.Role.DIRECTOR) {
                return { userId: member.userId };
            }
            currentId = member.reportsToId ?? null;
        }
        return null;
    }
    async findAll(user, filters) {
        const { search, type, status, branchId, startDate, endDate, page = 1, limit = 20, } = filters;
        const skip = (page - 1) * limit;
        const notificationWhere = {};
        if (type)
            notificationWhere.type = type;
        if (startDate || endDate) {
            notificationWhere.createdAt = {};
            if (startDate)
                notificationWhere.createdAt.gte = new Date(startDate);
            if (endDate)
                notificationWhere.createdAt.lte = new Date(endDate);
        }
        if (search) {
            notificationWhere.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { bookingId: { contains: search, mode: 'insensitive' } },
                { billingId: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (user.role === client_1.Role.SUPER_ADMIN) {
            if (branchId)
                notificationWhere.branchId = branchId;
        }
        else if (user.role === client_1.Role.ADMIN) {
            notificationWhere.branchId = user.admin?.branchId;
        }
        else if (user.member?.role === client_1.Role.DIRECTOR) {
            notificationWhere.branchId = user.member?.branchId;
        }
        const recipientWhere = {
            userId: user.id,
            notification: notificationWhere,
        };
        if (status)
            recipientWhere.status = status;
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
    async findLatest(userId) {
        return this.prisma.notificationRecipient.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                notification: true,
            },
        });
    }
    async getUnreadCount(userId) {
        return this.prisma.notificationRecipient.count({
            where: {
                userId,
                status: client_1.NotificationStatus.UNREAD,
            },
        });
    }
    async findOne(id, userId) {
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
            throw new common_1.NotFoundException('Notification not found');
        }
        return recipient;
    }
    async markRead(notificationId, userId) {
        const recipient = await this.prisma.notificationRecipient.findFirst({
            where: { notificationId, userId },
        });
        if (!recipient) {
            throw new common_1.NotFoundException('Notification not found');
        }
        return this.prisma.notificationRecipient.update({
            where: { id: recipient.id },
            data: {
                status: client_1.NotificationStatus.READ,
                readAt: new Date(),
            },
        });
    }
    async markAllRead(userId) {
        const result = await this.prisma.notificationRecipient.updateMany({
            where: {
                userId,
                status: client_1.NotificationStatus.UNREAD,
            },
            data: {
                status: client_1.NotificationStatus.READ,
                readAt: new Date(),
            },
        });
        return { updated: result.count };
    }
    async sendMessage(dto, senderId) {
        const notification = await this.prisma.notification.findUnique({
            where: { id: dto.notificationId },
        });
        if (!notification) {
            throw new common_1.NotFoundException('Source notification not found');
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
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map