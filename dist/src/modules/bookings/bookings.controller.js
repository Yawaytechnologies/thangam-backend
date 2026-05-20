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
exports.BookingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const bookings_service_1 = require("./bookings.service");
const create_booking_dto_1 = require("./dto/create-booking.dto");
const update_booking_dto_1 = require("./dto/update-booking.dto");
const booking_filter_dto_1 = require("./dto/booking-filter.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let BookingsController = class BookingsController {
    bookingsService;
    constructor(bookingsService) {
        this.bookingsService = bookingsService;
    }
    findAll(user, filters) {
        return this.bookingsService.findAll(user, filters);
    }
    create(dto, user) {
        return this.bookingsService.create(dto, user);
    }
    findOne(id) {
        return this.bookingsService.findOne(id);
    }
    update(id, dto, user) {
        return this.bookingsService.update(id, dto, user);
    }
    updateStatus(id, status, userId) {
        return this.bookingsService.updateStatus(id, status, userId);
    }
    async getPdf(id, res) {
        const buffer = await this.bookingsService.generatePdf(id);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="booking-${id}.pdf"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }
};
exports.BookingsController = BookingsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get all bookings with pagination and filters' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated list of bookings' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Not authenticated' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient role' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, booking_filter_dto_1.BookingFilterDto]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new booking' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Booking created successfully' }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid input or property not found',
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Not authenticated' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient role' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_booking_dto_1.CreateBookingDto, Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get a booking by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Booking detail' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Booking not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update a booking' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Booking updated' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Booking not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_booking_dto_1.UpdateBookingDto, Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Update booking status (advances property workflow)',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Status updated and workflow advanced',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Booking not found' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', enum: Object.values(client_1.BookingStatus) },
            },
            required: ['status'],
        },
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)('status')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Get)(':id/pdf'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Download booking PDF' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'PDF file stream',
        content: { 'application/pdf': {} },
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Booking not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getPdf", null);
exports.BookingsController = BookingsController = __decorate([
    (0, swagger_1.ApiTags)('Bookings'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('bookings'),
    __metadata("design:paramtypes", [bookings_service_1.BookingsService])
], BookingsController);
//# sourceMappingURL=bookings.controller.js.map