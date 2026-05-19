import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '@prisma/client';

export class SendMessageDto {
  @ApiProperty({ description: 'ID of the source notification to reply to' })
  @IsUUID()
  @IsNotEmpty()
  notificationId: string;

  @ApiProperty({ description: 'Name of the recipient' })
  @IsString()
  @IsNotEmpty()
  recipientName: string;

  @ApiProperty({ description: 'Role of the recipient' })
  @IsString()
  @IsNotEmpty()
  recipientRole: string;

  @ApiPropertyOptional({
    description: 'Branch ID associated with this message',
  })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiProperty({ enum: MessageType, description: 'Type of message' })
  @IsEnum(MessageType)
  @IsNotEmpty()
  messageType: MessageType;

  @ApiProperty({ description: 'Subject of the message' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: 'Body/content of the message' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({
    description: 'Related module name (e.g. Booking, Billing)',
  })
  @IsString()
  @IsOptional()
  relatedModule?: string;

  @ApiPropertyOptional({
    description: 'ID of the related entity in the module',
  })
  @IsString()
  @IsOptional()
  relatedEntityId?: string;
}
