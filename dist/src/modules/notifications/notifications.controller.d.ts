import { NotificationsService } from './notifications.service';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { SendMessageDto } from './dto/send-message.dto';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
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
    findLatest(user: any): Promise<({
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
    getUnreadCount(user: any): Promise<{
        count: number;
    }>;
    markAllRead(user: any): Promise<{
        updated: number;
    }>;
    sendMessage(dto: SendMessageDto, user: any): Promise<{
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
    findOne(id: string, user: any): Promise<{
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
    markRead(id: string, user: any): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.NotificationStatus;
        createdAt: Date;
        userId: string;
        notificationId: string;
        readAt: Date | null;
    }>;
}
