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
exports.DocumentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const documents_service_1 = require("./documents.service");
let DocumentsController = class DocumentsController {
    documentsService;
    constructor(documentsService) {
        this.documentsService = documentsService;
    }
    upload(file, entityType, entityId, documentType, uploadedBy) {
        return this.documentsService.upload(file, entityType, entityId, documentType, uploadedBy);
    }
    async getSignedUrl(id) {
        const result = await this.documentsService.getDocumentWithUrl(id);
        return { signedUrl: result.signedUrl };
    }
    getDocumentsForEntity(entityType, entityId) {
        return this.documentsService.getDocumentsForEntity(entityType, entityId);
    }
};
exports.DocumentsController = DocumentsController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a document and attach it to an entity' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['file', 'entityType', 'entityId', 'documentType'],
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'File to upload',
                },
                entityType: {
                    type: 'string',
                    description: 'Entity type (e.g. property, member)',
                },
                entityId: { type: 'string', description: 'UUID of the entity' },
                documentType: {
                    type: 'string',
                    enum: Object.values(client_1.DocumentType),
                    description: 'Document category',
                },
            },
        },
    }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('entityType')),
    __param(2, (0, common_1.Body)('entityId')),
    __param(3, (0, common_1.Body)('documentType')),
    __param(4, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)(':id/url'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a 1-hour signed URL for a document' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Document UUID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getSignedUrl", null);
__decorate([
    (0, common_1.Get)('entity/:entityType/:entityId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all documents for a given entity' }),
    (0, swagger_1.ApiParam)({
        name: 'entityType',
        description: 'Entity type (e.g. property, member)',
    }),
    (0, swagger_1.ApiParam)({ name: 'entityId', description: 'UUID of the entity' }),
    __param(0, (0, common_1.Param)('entityType')),
    __param(1, (0, common_1.Param)('entityId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "getDocumentsForEntity", null);
exports.DocumentsController = DocumentsController = __decorate([
    (0, swagger_1.ApiTags)('Documents'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('documents'),
    __metadata("design:paramtypes", [documents_service_1.DocumentsService])
], DocumentsController);
//# sourceMappingURL=documents.controller.js.map