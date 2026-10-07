import {
  Controller,
  Delete,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // GET /notifications
  @Get()
  @ApiOperation({ summary: 'Get all notifications for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Paginated notifications list' })
  findAll(@CurrentUser() user: any, @Query() filters: NotificationFilterDto) {
    return this.notificationsService.findAll(user, filters);
  }

  // GET /notifications/latest
  @Get('latest')
  @ApiOperation({
    summary: 'Get latest 10 notifications for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Latest notifications' })
  findLatest(@CurrentUser() user: any) {
    return this.notificationsService.findLatest(user);
  }

  // GET /notifications/unread-count
  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count',
    schema: { example: { count: 5 } },
  })
  async getUnreadCount(@CurrentUser() user: any): Promise<{ count: number }> {
    const count = await this.notificationsService.getUnreadCount(user);
    return { count };
  }

  // PATCH /notifications/mark-all-read
  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Mark all unread notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  markAllRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllRead(user);
  }

  @Post('announcements')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Send an announcement to authorized Directors' })
  @ApiResponse({ status: 201, description: 'Announcement sent' })
  createAnnouncement(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.createAnnouncement(dto, user);
  }

  // POST /notifications/send-message
  @Post('send-message')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Send a notification message (SUPER_ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Message created successfully' })
  sendMessage(@Body() dto: SendMessageDto, @CurrentUser() user: any) {
    return this.notificationsService.sendMessage(dto, user.id);
  }

  // GET /notifications/:id
  @Get(':id')
  @ApiOperation({ summary: 'Get a single notification by ID' })
  @ApiParam({ name: 'id', description: 'Notification ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Notification detail' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.notificationsService.findOne(id, user);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Delete a notification recipient from your own inbox',
  })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.notificationsService.remove(id, user);
  }

  // PATCH /notifications/:id/read
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  markRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.notificationsService.markRead(id, user);
  }

  // DELETE /notifications/:id
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification from the current user inbox' })
  @ApiParam({ name: 'id', description: 'Notification ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  deleteForUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.deleteForUser(id, user);
  }
}
