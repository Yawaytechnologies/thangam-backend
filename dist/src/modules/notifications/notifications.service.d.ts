import { NotificationType } from '@prisma/client';
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
export declare class NotificationsService {
    private readonly prisma;
    private gateway;
    constructor(prisma: PrismaService);
    setGateway(gateway: {
        emitToUser(userId: string, event: string, data: any): void;
    }): void;
    createNotification(dto: CreateNotificationDto): Promise<{
        id: string;
        createdAt: Date;
        type: import("@prisma/client").$Enums.NotificationType;
        title: string;
        branchId: string | null;
        relatedModule: string | null;
        relatedEntityId: string | null;
        message: string;
        priority: string;
        triggeredById: string | null;
        propertyId: string | null;
        bookingId: string | null;
        billingId: string | null;
    }>;
    dispatch(payload: DispatchPayload): Promise<void>;
    private findDirectorInChain;
    findAll(user: any, filters: NotificationFilterDto): Promise<{
        data: ({
            notification: {
                triggeredBy: {
                    id: string;
                    email: string | null;
                    phone: string | null;
                    role: import("@prisma/client").$Enums.Role;
                } | null;
            } & {
                id: string;
                createdAt: Date;
                type: import("@prisma/client").$Enums.NotificationType;
                title: string;
                branchId: string | null;
                relatedModule: string | null;
                relatedEntityId: string | null;
                message: string;
                priority: string;
                triggeredById: string | null;
                propertyId: string | null;
                bookingId: string | null;
                billingId: string | null;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.NotificationStatus;
            createdAt: Date;
            userId: string;
            notificationId: string;
            readAt: Date | null;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    findLatest(userId: string): Promise<({
        notification: {
            id: string;
            createdAt: Date;
            type: import("@prisma/client").$Enums.NotificationType;
            title: string;
            branchId: string | null;
            relatedModule: string | null;
            relatedEntityId: string | null;
            message: string;
            priority: string;
            triggeredById: string | null;
            propertyId: string | null;
            bookingId: string | null;
            billingId: string | null;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.NotificationStatus;
        createdAt: Date;
        userId: string;
        notificationId: string;
        readAt: Date | null;
    })[]>;
    getUnreadCount(userId: string): Promise<number>;
    findOne(id: string, userId: string): Promise<{
        notification: {
            triggeredBy: {
                id: string;
                email: string | null;
                phone: string | null;
                role: import("@prisma/client").$Enums.Role;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            type: import("@prisma/client").$Enums.NotificationType;
            title: string;
            branchId: string | null;
            relatedModule: string | null;
            relatedEntityId: string | null;
            message: string;
            priority: string;
            triggeredById: string | null;
            propertyId: string | null;
            bookingId: string | null;
            billingId: string | null;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.NotificationStatus;
        createdAt: Date;
        userId: string;
        notificationId: string;
        readAt: Date | null;
    }>;
    markRead(notificationId: string, userId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.NotificationStatus;
        createdAt: Date;
        userId: string;
        notificationId: string;
        readAt: Date | null;
    }>;
    markAllRead(userId: string): Promise<{
        updated: number;
    }>;
    sendMessage(dto: SendMessageDto, senderId: string): Promise<{
        id: string;
        createdAt: Date;
        branchId: string | null;
        recipientName: string;
        recipientRole: string;
        messageType: import("@prisma/client").$Enums.MessageType;
        subject: string;
        body: string;
        relatedModule: string | null;
        relatedEntityId: string | null;
        senderId: string;
    }>;
}
