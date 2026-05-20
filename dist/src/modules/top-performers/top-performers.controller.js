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
exports.TopPerformersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
const top_performers_service_1 = require("./top-performers.service");
const create_top_performer_dto_1 = require("./dto/create-top-performer.dto");
const reorder_top_performers_dto_1 = require("./dto/reorder-top-performers.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
class ToggleFreezeDto {
    frozen;
}
__decorate([
    (0, swagger_2.ApiProperty)({ description: 'Whether to freeze top performers display' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ToggleFreezeDto.prototype, "frozen", void 0);
let TopPerformersController = class TopPerformersController {
    topPerformersService;
    constructor(topPerformersService) {
        this.topPerformersService = topPerformersService;
    }
    findAll() {
        return this.topPerformersService.findAll();
    }
    getFreezeState() {
        return this.topPerformersService.getFreezeState();
    }
    create(dto) {
        return this.topPerformersService.create(dto);
    }
    update(id, dto) {
        return this.topPerformersService.update(id, dto);
    }
    remove(id) {
        return this.topPerformersService.remove(id);
    }
    reorder(dto) {
        return this.topPerformersService.reorder(dto);
    }
    toggleFreeze(body) {
        return this.topPerformersService.toggleFreeze(body.frozen);
    }
};
exports.TopPerformersController = TopPerformersController;
__decorate([
    (0, common_1.Get)('super-admin/dashboard/top-performers'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get top performers grouped by role with freeze state',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TopPerformersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('settings/top-performers'),
    (0, swagger_1.ApiOperation)({ summary: 'Get top performers freeze state' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TopPerformersController.prototype, "getFreezeState", null);
__decorate([
    (0, common_1.Post)('top-performers'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a new top performer entry (SUPER_ADMIN only)',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_top_performer_dto_1.CreateTopPerformerDto]),
    __metadata("design:returntype", void 0)
], TopPerformersController.prototype, "create", null);
__decorate([
    (0, common_1.Put)('top-performers/:id'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiOperation)({ summary: 'Update a top performer entry (SUPER_ADMIN only)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TopPerformersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('top-performers/:id'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a top performer entry (SUPER_ADMIN only)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TopPerformersController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)('top-performers/reorder'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Reorder top performers (SUPER_ADMIN only)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reorder_top_performers_dto_1.ReorderTopPerformersDto]),
    __metadata("design:returntype", void 0)
], TopPerformersController.prototype, "reorder", null);
__decorate([
    (0, common_1.Patch)('settings/top-performers/freeze'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Toggle freeze state for top performers (SUPER_ADMIN only)',
    }),
    (0, swagger_1.ApiBody)({ type: ToggleFreezeDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ToggleFreezeDto]),
    __metadata("design:returntype", void 0)
], TopPerformersController.prototype, "toggleFreeze", null);
exports.TopPerformersController = TopPerformersController = __decorate([
    (0, swagger_1.ApiTags)('Top Performers'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [top_performers_service_1.TopPerformersService])
], TopPerformersController);
//# sourceMappingURL=top-performers.controller.js.map