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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const notifications_service_1 = require("./notifications.service");
const notification_filter_dto_1 = require("./dto/notification-filter.dto");
const send_message_dto_1 = require("./dto/send-message.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let NotificationsController = class NotificationsController {
    notificationsService;
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
    }
    findAll(user, filters) {
        return this.notificationsService.findAll(user, filters);
    }
    findLatest(user) {
        return this.notificationsService.findLatest(user.id);
    }
    async getUnreadCount(user) {
        const count = await this.notificationsService.getUnreadCount(user.id);
        return { count };
    }
    markAllRead(user) {
        return this.notificationsService.markAllRead(user.id);
    }
    sendMessage(dto, user) {
        return this.notificationsService.sendMessage(dto, user.id);
    }
    findOne(id, user) {
        return this.notificationsService.findOne(id, user.id);
    }
    markRead(id, user) {
        return this.notificationsService.markRead(id, user.id);
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all notifications for the authenticated user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated notifications list' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, notification_filter_dto_1.NotificationFilterDto]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('latest'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get latest 10 notifications for the authenticated user',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Latest notifications' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "findLatest", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get unread notification count for the authenticated user',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Unread count',
        schema: { example: { count: 5 } },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Patch)('mark-all-read'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark all unread notifications as read' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'All notifications marked as read' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "markAllRead", null);
__decorate([
    (0, common_1.Post)('send-message'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Send a notification message (SUPER_ADMIN only)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Message created successfully' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_message_dto_1.SendMessageDto, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single notification by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Notification ID (UUID)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Notification detail' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Notification not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark a notification as read' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Notification ID (UUID)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Notification marked as read' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Notification not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "markRead", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, swagger_1.ApiTags)('Notifications'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('notifications'),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map