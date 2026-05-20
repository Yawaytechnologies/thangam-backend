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
exports.MembersController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const image_file_pipe_1 = require("../../common/pipes/image-file.pipe");
const client_1 = require("@prisma/client");
const members_service_1 = require("./members.service");
const create_member_dto_1 = require("./dto/create-member.dto");
const update_member_dto_1 = require("./dto/update-member.dto");
const member_filter_dto_1 = require("./dto/member-filter.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
class UpdateStatusDto {
    status;
}
__decorate([
    (0, swagger_2.ApiProperty)({ enum: client_1.UserStatus }),
    (0, class_validator_1.IsEnum)(client_1.UserStatus),
    __metadata("design:type", String)
], UpdateStatusDto.prototype, "status", void 0);
let MembersController = class MembersController {
    membersService;
    constructor(membersService) {
        this.membersService = membersService;
    }
    findAll(user, filters) {
        return this.membersService.findAll(user, filters);
    }
    create(dto, user) {
        return this.membersService.create(dto, user);
    }
    getTeamForMobile(user, filters) {
        return this.membersService.getTeamForMobile(user, filters);
    }
    getMemberBottomSheet(id) {
        return this.membersService.getMemberBottomSheet(id);
    }
    findOne(id, user) {
        return this.membersService.findOne(id, user);
    }
    update(id, dto) {
        return this.membersService.update(id, dto);
    }
    updateStatus(id, body) {
        return this.membersService.updateStatus(id, body.status);
    }
    uploadPhoto(id, file, uploadedBy) {
        return this.membersService.uploadProfilePhoto(id, file, uploadedBy);
    }
};
exports.MembersController = MembersController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List members (scoped by role)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Paginated list of members' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, member_filter_dto_1.MemberFilterDto]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new member' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Member created with default password' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_member_dto_1.CreateMemberDto, Object]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('team'),
    (0, swagger_1.ApiOperation)({ summary: 'Get downline team for mobile (hierarchy-scoped)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, member_filter_dto_1.MemberFilterDto]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "getTeamForMobile", null);
__decorate([
    (0, common_1.Get)('team/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get member bottom sheet for mobile' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "getMemberBottomSheet", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single member by ID with downline summary' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update member (SUPER_ADMIN only)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_member_dto_1.UpdateMemberDto]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Update member status (SUPER_ADMIN only)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateStatusDto]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/photo'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload profile photo for a member (JPEG/PNG/WebP, max 5 MB)',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['file'],
            properties: { file: { type: 'string', format: 'binary' } },
        },
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.UploadedFile)(image_file_pipe_1.ImageFilePipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], MembersController.prototype, "uploadPhoto", null);
exports.MembersController = MembersController = __decorate([
    (0, swagger_1.ApiTags)('Members'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('members'),
    __metadata("design:paramtypes", [members_service_1.MembersService])
], MembersController);
//# sourceMappingURL=members.controller.js.map