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
exports.PropertiesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const image_file_pipe_1 = require("../../common/pipes/image-file.pipe");
const client_1 = require("@prisma/client");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const properties_service_1 = require("./properties.service");
const create_property_dto_1 = require("./dto/create-property.dto");
const update_property_dto_1 = require("./dto/update-property.dto");
const update_workflow_dto_1 = require("./dto/update-workflow.dto");
const property_filter_dto_1 = require("./dto/property-filter.dto");
let PropertiesController = class PropertiesController {
    propertiesService;
    constructor(propertiesService) {
        this.propertiesService = propertiesService;
    }
    findAll(filters) {
        return this.propertiesService.findAll(filters);
    }
    create(dto, userId) {
        return this.propertiesService.create(dto, userId);
    }
    findOne(id) {
        return this.propertiesService.findOne(id);
    }
    getWorkflow(id) {
        return this.propertiesService.getWorkflow(id);
    }
    getDocuments(id) {
        return this.propertiesService.getDocuments(id);
    }
    update(id, dto, userId) {
        return this.propertiesService.update(id, dto, userId);
    }
    updateWorkflow(id, dto, userId) {
        return this.propertiesService.updateWorkflow(id, dto, userId);
    }
    uploadImage(id, file, uploadedBy) {
        return this.propertiesService.uploadImage(id, file, uploadedBy);
    }
};
exports.PropertiesController = PropertiesController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all properties with optional filters and pagination',
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [property_filter_dto_1.PropertyFilterDto]),
    __metadata("design:returntype", void 0)
], PropertiesController.prototype, "findAll", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN),
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new property (SUPER_ADMIN only)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_property_dto_1.CreatePropertyDto, String]),
    __metadata("design:returntype", void 0)
], PropertiesController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single property by ID with full details' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Property UUID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PropertiesController.prototype, "findOne", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':id/workflow'),
    (0, swagger_1.ApiOperation)({ summary: 'Get workflow history for a property' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Property UUID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PropertiesController.prototype, "getWorkflow", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':id/documents'),
    (0, swagger_1.ApiOperation)({ summary: 'Get documents for a property' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Property UUID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PropertiesController.prototype, "getDocuments", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN),
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update property details (SUPER_ADMIN only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Property UUID' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_property_dto_1.UpdatePropertyDto, String]),
    __metadata("design:returntype", void 0)
], PropertiesController.prototype, "update", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN),
    (0, common_1.Patch)(':id/workflow'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update property workflow status (SUPER_ADMIN only)',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Property UUID' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_workflow_dto_1.UpdateWorkflowDto, String]),
    __metadata("design:returntype", void 0)
], PropertiesController.prototype, "updateWorkflow", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, common_1.Post)(':id/images'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload a property image (JPEG/PNG/WebP, max 5 MB)',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Property UUID' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['file'],
            properties: { file: { type: 'string', format: 'binary' } },
        },
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)(image_file_pipe_1.ImageFilePipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], PropertiesController.prototype, "uploadImage", null);
exports.PropertiesController = PropertiesController = __decorate([
    (0, swagger_1.ApiTags)('Properties'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('properties'),
    __metadata("design:paramtypes", [properties_service_1.PropertiesService])
], PropertiesController);
//# sourceMappingURL=properties.controller.js.map