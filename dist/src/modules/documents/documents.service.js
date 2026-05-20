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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
const prisma_service_1 = require("../../prisma/prisma.service");
let DocumentsService = class DocumentsService {
    prisma;
    configService;
    supabase;
    bucket;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        const supabaseUrl = this.configService.get('supabase.url');
        const serviceRoleKey = this.configService.get('supabase.serviceRoleKey');
        this.bucket =
            this.configService.get('supabase.bucket') ?? 'sth-files';
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey);
    }
    async upload(file, entityType, entityId, documentType, uploadedBy) {
        const storagePath = `${entityType}/${entityId}/${Date.now()}-${file.originalname}`;
        const { error } = await this.supabase.storage
            .from(this.bucket)
            .upload(storagePath, file.buffer, { contentType: file.mimetype });
        if (error) {
            throw new common_1.BadRequestException(`File upload failed: ${error.message}`);
        }
        const document = await this.prisma.document.create({
            data: {
                entityType,
                entityId,
                documentType,
                fileName: file.originalname,
                storagePath,
                mimeType: file.mimetype,
                fileSize: file.size,
                uploadedBy,
            },
        });
        return document;
    }
    async getSignedUrl(storagePath) {
        const { data, error } = await this.supabase.storage
            .from(this.bucket)
            .createSignedUrl(storagePath, 3600);
        if (error || !data?.signedUrl) {
            throw new common_1.BadRequestException(`Failed to generate signed URL: ${error?.message ?? 'Unknown error'}`);
        }
        return data.signedUrl;
    }
    async getDocumentsForEntity(entityType, entityId) {
        return this.prisma.document.findMany({
            where: { entityType, entityId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getLatestSignedUrl(entityType, entityId, documentType) {
        const doc = await this.prisma.document.findFirst({
            where: { entityType, entityId, documentType },
            orderBy: { createdAt: 'desc' },
        });
        if (!doc)
            return null;
        try {
            return await this.getSignedUrl(doc.storagePath);
        }
        catch {
            return null;
        }
    }
    async getDocumentWithUrl(documentId) {
        const document = await this.prisma.document.findUnique({
            where: { id: documentId },
        });
        if (!document) {
            throw new common_1.NotFoundException(`Document with id ${documentId} not found`);
        }
        const signedUrl = await this.getSignedUrl(document.storagePath);
        return { ...document, signedUrl };
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map