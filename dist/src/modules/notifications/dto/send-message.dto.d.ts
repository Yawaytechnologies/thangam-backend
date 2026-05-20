import { MessageType } from '@prisma/client';
export declare class SendMessageDto {
    notificationId: string;
    recipientName: string;
    recipientRole: string;
    branchId?: string;
    messageType: MessageType;
    subject: string;
    body: string;
    relatedModule?: string;
    relatedEntityId?: string;
}
