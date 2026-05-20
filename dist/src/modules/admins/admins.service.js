"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma_service_1 = require("../../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const documents_service_1 = require("../documents/documents.service");
const id_generator_util_1 = require("../../common/utils/id-generator.util");
let AdminsService = class AdminsService {
    prisma;
    documentsService;
    notificationsService;
    constructor(prisma, documentsService, notificationsService) {
        this.prisma = prisma;
        this.documentsService = documentsService;
        this.notificationsService = notificationsService;
    }
    async findAll(filters) {
        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (filters.status) {
            where.status = filters.status;
        }
        if (filters.branchId) {
            where.branchId = filters.branchId;
        }
        if (filters.search) {
            where.OR = [
                { fullName: { contains: filters.search, mode: 'insensitive' } },
                { adminId: { contains: filters.search, mode: 'insensitive' } },
                { phone: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        const [data, total] = await Promise.all([
            this.prisma.admin.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    branch: {
                        select: {
                            id: true,
                            name: true,
                            branchCode: true,
                            city: true,
                            state: true,
                            status: true,
                        },
                    },
                    user: {
                        select: {
                            id: true,
                            email: true,
                            phone: true,
                            role: true,
                            status: true,
                            lastLoginAt: true,
                        },
                    },
                },
            }),
            this.prisma.admin.count({ where }),
        ]);
        return { data, total, page, limit };
    }
    async create(dto, createdById) {
        const branch = await this.prisma.branch.findUnique({
            where: { id: dto.branchId },
        });
        if (!branch) {
            throw new common_1.NotFoundException(`Branch with id ${dto.branchId} not found`);
        }
        if (dto.phone) {
            const existingPhone = await this.prisma.user.findUnique({
                where: { phone: dto.phone },
            });
            if (existingPhone) {
                throw new common_1.ConflictException('A user with this phone number already exists');
            }
        }
        if (dto.email) {
            const existingEmail = await this.prisma.user.findUnique({
                where: { email: dto.email },
            });
            if (existingEmail) {
                throw new common_1.ConflictException('A user with this email already exists');
            }
        }
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const existingCount = await this.prisma.admin.count();
        const adminId = (0, id_generator_util_1.generateAdminId)(existingCount + 1);
        const result = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    phone: dto.phone,
                    email: dto.email ?? null,
                    passwordHash,
                    role: client_1.Role.ADMIN,
                    status: dto.status ?? client_1.UserStatus.ACTIVE,
                },
            });
            const admin = await tx.admin.create({
                data: {
                    adminId,
                    userId: user.id,
                    branchId: dto.branchId,
                    fullName: dto.fullName,
                    gender: dto.gender ?? null,
                    dateOfBirth: dto.dateOfBirth ?? null,
                    phone: dto.phone,
                    email: dto.email ?? null,
                    address: dto.address ?? null,
                    city: dto.city ?? null,
                    district: dto.district ?? null,
                    state: dto.state ?? null,
                    pincode: dto.pincode ?? null,
                    status: dto.status ?? client_1.UserStatus.ACTIVE,
                },
                include: {
                    branch: {
                        select: {
                            id: true,
                            name: true,
                            branchCode: true,
                        },
                    },
                    user: {
                        select: {
                            id: true,
                            email: true,
                            phone: true,
                            role: true,
                            status: true,
                        },
                    },
                },
            });
            return admin;
        });
        if (this.notificationsService) {
            try {
                await this.notificationsService.createNotification({
                    title: 'Admin Created',
                    message: `New admin "${result.fullName}" (${result.adminId}) has been created for branch "${result.branch.name}".`,
                    type: 'ADMIN_ACTIVITY',
                    triggeredById: createdById,
                    branchId: dto.branchId,
                });
            }
            catch {
            }
        }
        return result;
    }
    async findOne(id) {
        const admin = await this.prisma.admin.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        phone: true,
                        role: true,
                        status: true,
                        lastLoginAt: true,
                        createdAt: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        name: true,
                        branchCode: true,
                        city: true,
                        state: true,
                        status: true,
                    },
                },
            },
        });
        if (!admin) {
            throw new common_1.NotFoundException(`Admin with id ${id} not found`);
        }
        const [membersAdded, bookingsHandled, billingUpdates] = await Promise.all([
            this.prisma.member.count({
                where: { branchId: admin.branchId },
            }),
            this.prisma.booking.count({
                where: { branchId: admin.branchId },
            }),
            this.prisma.billing.count({
                where: {
                    booking: {
                        branchId: admin.branchId,
                    },
                },
            }),
        ]);
        const profilePhotoUrl = await this.documentsService.getLatestSignedUrl('admin', id, 'PROFILE_PHOTO');
        return {
            ...admin,
            profilePhotoUrl,
            activitySummary: {
                membersAdded,
                bookingsHandled,
                billingUpdates,
            },
        };
    }
    async update(id, dto) {
        const admin = await this.prisma.admin.findUnique({
            where: { id },
            include: { user: true },
        });
        if (!admin) {
            throw new common_1.NotFoundException(`Admin with id ${id} not found`);
        }
        if (dto.branchId) {
            const branch = await this.prisma.branch.findUnique({
                where: { id: dto.branchId },
            });
            if (!branch) {
                throw new common_1.NotFoundException(`Branch with id ${dto.branchId} not found`);
            }
        }
        const updatedAdmin = await this.prisma.$transaction(async (tx) => {
            const userUpdates = {};
            if (dto.email !== undefined)
                userUpdates.email = dto.email;
            if (dto.phone !== undefined)
                userUpdates.phone = dto.phone;
            if (dto.status !== undefined)
                userUpdates.status = dto.status;
            if (Object.keys(userUpdates).length > 0) {
                await tx.user.update({
                    where: { id: admin.userId },
                    data: userUpdates,
                });
            }
            return tx.admin.update({
                where: { id },
                data: {
                    ...(dto.fullName !== undefined && { fullName: dto.fullName }),
                    ...(dto.gender !== undefined && { gender: dto.gender }),
                    ...(dto.dateOfBirth !== undefined && {
                        dateOfBirth: dto.dateOfBirth,
                    }),
                    ...(dto.phone !== undefined && { phone: dto.phone }),
                    ...(dto.email !== undefined && { email: dto.email }),
                    ...(dto.address !== undefined && { address: dto.address }),
                    ...(dto.city !== undefined && { city: dto.city }),
                    ...(dto.district !== undefined && { district: dto.district }),
                    ...(dto.state !== undefined && { state: dto.state }),
                    ...(dto.pincode !== undefined && { pincode: dto.pincode }),
                    ...(dto.branchId !== undefined && { branchId: dto.branchId }),
                    ...(dto.status !== undefined && { status: dto.status }),
                },
                include: {
                    branch: {
                        select: {
                            id: true,
                            name: true,
                            branchCode: true,
                        },
                    },
                    user: {
                        select: {
                            id: true,
                            email: true,
                            phone: true,
                            role: true,
                            status: true,
                        },
                    },
                },
            });
        });
        return updatedAdmin;
    }
    async updateStatus(id, status) {
        const admin = await this.prisma.admin.findUnique({
            where: { id },
            include: { user: true },
        });
        if (!admin) {
            throw new common_1.NotFoundException(`Admin with id ${id} not found`);
        }
        await this.prisma.$transaction([
            this.prisma.admin.update({
                where: { id },
                data: { status },
            }),
            this.prisma.user.update({
                where: { id: admin.userId },
                data: { status },
            }),
        ]);
        return this.prisma.admin.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        phone: true,
                        role: true,
                        status: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        name: true,
                        branchCode: true,
                    },
                },
            },
        });
    }
    async getOwnProfile(userId) {
        const admin = await this.prisma.admin.findUnique({
            where: { userId },
            include: {
                branch: {
                    select: {
                        id: true,
                        name: true,
                        branchCode: true,
                        city: true,
                        state: true,
                        status: true,
                        phone: true,
                        email: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        phone: true,
                        role: true,
                        status: true,
                        lastLoginAt: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!admin) {
            throw new common_1.NotFoundException('Admin profile not found');
        }
        const profilePhotoUrl = await this.documentsService.getLatestSignedUrl('admin', admin.id, 'PROFILE_PHOTO');
        return { ...admin, profilePhotoUrl };
    }
    async uploadProfilePhoto(adminId, file, uploadedBy) {
        const admin = await this.prisma.admin.findUnique({
            where: { id: adminId },
        });
        if (!admin)
            throw new common_1.NotFoundException(`Admin with id ${adminId} not found`);
        const document = await this.documentsService.upload(file, 'admin', adminId, 'PROFILE_PHOTO', uploadedBy);
        const profilePhotoUrl = await this.documentsService.getSignedUrl(document.storagePath);
        return { document, profilePhotoUrl };
    }
};
exports.AdminsService = AdminsService;
exports.AdminsService = AdminsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        documents_service_1.DocumentsService,
        notifications_service_1.NotificationsService])
], AdminsService);
//# sourceMappingURL=admins.service.js.map