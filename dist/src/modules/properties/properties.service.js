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
exports.PropertiesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const documents_service_1 = require("../documents/documents.service");
const id_generator_util_1 = require("../../common/utils/id-generator.util");
let PropertiesService = class PropertiesService {
    prisma;
    documentsService;
    constructor(prisma, documentsService) {
        this.prisma = prisma;
        this.documentsService = documentsService;
    }
    async findAll(filters) {
        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (filters.search) {
            where.OR = [
                { propertyName: { contains: filters.search, mode: 'insensitive' } },
                { propertyCode: { contains: filters.search, mode: 'insensitive' } },
                { plotNumber: { contains: filters.search, mode: 'insensitive' } },
                { projectName: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        if (filters.propertyType) {
            where.propertyType = filters.propertyType;
        }
        if (filters.workflowStatus) {
            where.workflowStatus = filters.workflowStatus;
        }
        const [total, properties] = await this.prisma.$transaction([
            this.prisma.property.count({ where }),
            this.prisma.property.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    bookings: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: {
                            id: true,
                            bookingId: true,
                            status: true,
                            applicantName: true,
                            bookingDate: true,
                        },
                    },
                    _count: {
                        select: { bookings: true },
                    },
                },
            }),
        ]);
        const data = properties.map((p) => ({
            ...p,
            bookingCount: p._count.bookings,
            latestBookingStatus: p.bookings[0]?.status ?? null,
            latestBooking: p.bookings[0] ?? null,
            _count: undefined,
            bookings: undefined,
        }));
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async create(dto, userId) {
        return this.prisma.$transaction(async (tx) => {
            const count = await tx.property.count();
            const propertyId = (0, id_generator_util_1.generatePropertyId)(count + 1);
            const property = await tx.property.create({
                data: {
                    propertyId,
                    propertyName: dto.propertyName,
                    propertyCode: dto.propertyCode,
                    projectName: dto.projectName,
                    plotNumber: dto.plotNumber,
                    propertyType: dto.propertyType,
                    squareFeet: dto.squareFeet,
                    facing: dto.facing,
                    approvalStatus: dto.approvalStatus,
                    address: dto.address,
                    city: dto.city,
                    district: dto.district,
                    state: dto.state,
                    pincode: dto.pincode,
                    mapLocation: dto.mapLocation,
                    workflowStatus: client_1.WorkflowStatus.AVAILABLE,
                },
            });
            await tx.workflowHistory.create({
                data: {
                    entityType: 'property',
                    entityId: property.id,
                    fromStatus: null,
                    toStatus: client_1.WorkflowStatus.AVAILABLE,
                    remarks: 'Property created',
                    performedBy: userId,
                },
            });
            return property;
        });
    }
    async findOne(id) {
        const property = await this.prisma.property.findUnique({
            where: { id },
            include: {
                bookings: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: {
                        payments: true,
                    },
                },
                workflowHistory: {
                    orderBy: { createdAt: 'asc' },
                },
                documents: true,
            },
        });
        if (!property) {
            throw new common_1.NotFoundException(`Property with id ${id} not found`);
        }
        let latestBilling = null;
        if (property.bookings.length > 0) {
            latestBilling = await this.prisma.billing.findFirst({
                where: { bookingId: property.bookings[0].id },
                orderBy: { createdAt: 'desc' },
            });
        }
        const imageDocs = property.documents.filter((d) => d.documentType === 'PROPERTY_IMAGE');
        const images = await Promise.all(imageDocs.map(async (doc) => {
            try {
                const url = await this.documentsService.getSignedUrl(doc.storagePath);
                return { id: doc.id, fileName: doc.fileName, url };
            }
            catch {
                return { id: doc.id, fileName: doc.fileName, url: null };
            }
        }));
        return {
            ...property,
            images,
            latestBooking: property.bookings[0] ?? null,
            latestBilling,
        };
    }
    async uploadImage(propertyId, file, uploadedBy) {
        const property = await this.prisma.property.findUnique({
            where: { id: propertyId },
        });
        if (!property)
            throw new common_1.NotFoundException(`Property with id ${propertyId} not found`);
        const document = await this.documentsService.upload(file, 'property', propertyId, 'PROPERTY_IMAGE', uploadedBy);
        const url = await this.documentsService.getSignedUrl(document.storagePath);
        return { document, url };
    }
    async getWorkflow(id) {
        const property = await this.prisma.property.findUnique({ where: { id } });
        if (!property) {
            throw new common_1.NotFoundException(`Property with id ${id} not found`);
        }
        return this.prisma.workflowHistory.findMany({
            where: {
                entityType: 'property',
                entityId: id,
            },
            orderBy: { createdAt: 'asc' },
        });
    }
    async getDocuments(id) {
        const property = await this.prisma.property.findUnique({ where: { id } });
        if (!property) {
            throw new common_1.NotFoundException(`Property with id ${id} not found`);
        }
        return this.prisma.document.findMany({
            where: {
                entityType: 'property',
                entityId: id,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async update(id, dto, _userId) {
        const property = await this.prisma.property.findUnique({ where: { id } });
        if (!property) {
            throw new common_1.NotFoundException(`Property with id ${id} not found`);
        }
        return this.prisma.property.update({
            where: { id },
            data: {
                ...(dto.propertyName !== undefined && {
                    propertyName: dto.propertyName,
                }),
                ...(dto.propertyCode !== undefined && {
                    propertyCode: dto.propertyCode,
                }),
                ...(dto.projectName !== undefined && { projectName: dto.projectName }),
                ...(dto.plotNumber !== undefined && { plotNumber: dto.plotNumber }),
                ...(dto.propertyType !== undefined && {
                    propertyType: dto.propertyType,
                }),
                ...(dto.squareFeet !== undefined && { squareFeet: dto.squareFeet }),
                ...(dto.facing !== undefined && { facing: dto.facing }),
                ...(dto.approvalStatus !== undefined && {
                    approvalStatus: dto.approvalStatus,
                }),
                ...(dto.address !== undefined && { address: dto.address }),
                ...(dto.city !== undefined && { city: dto.city }),
                ...(dto.district !== undefined && { district: dto.district }),
                ...(dto.state !== undefined && { state: dto.state }),
                ...(dto.pincode !== undefined && { pincode: dto.pincode }),
                ...(dto.mapLocation !== undefined && { mapLocation: dto.mapLocation }),
            },
        });
    }
    async updateWorkflow(id, dto, userId) {
        const property = await this.prisma.property.findUnique({ where: { id } });
        if (!property) {
            throw new common_1.NotFoundException(`Property with id ${id} not found`);
        }
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.property.update({
                where: { id },
                data: { workflowStatus: dto.workflowStatus },
            });
            await tx.workflowHistory.create({
                data: {
                    entityType: 'property',
                    entityId: id,
                    fromStatus: property.workflowStatus,
                    toStatus: dto.workflowStatus,
                    remarks: dto.remarks,
                    performedBy: userId,
                },
            });
            return updated;
        });
    }
};
exports.PropertiesService = PropertiesService;
exports.PropertiesService = PropertiesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        documents_service_1.DocumentsService])
], PropertiesService);
//# sourceMappingURL=properties.service.js.map