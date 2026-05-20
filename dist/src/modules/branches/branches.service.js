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
exports.BranchesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const id_generator_util_1 = require("../../common/utils/id-generator.util");
let BranchesService = class BranchesService {
    prisma;
    notificationsService;
    constructor(prisma, notificationsService) {
        this.prisma = prisma;
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
        if (filters.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { branchCode: { contains: filters.search, mode: 'insensitive' } },
                { city: { contains: filters.search, mode: 'insensitive' } },
                { state: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        const [data, total] = await Promise.all([
            this.prisma.branch.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: {
                            admins: true,
                            members: true,
                        },
                    },
                },
            }),
            this.prisma.branch.count({ where }),
        ]);
        return { data, total, page, limit };
    }
    async create(dto, userId) {
        const existingCount = await this.prisma.branch.count();
        const branchCode = (0, id_generator_util_1.generateBranchCode)(existingCount + 1);
        if (dto.adminId) {
            const admin = await this.prisma.admin.findUnique({
                where: { id: dto.adminId },
            });
            if (!admin) {
                throw new common_1.NotFoundException(`Admin with id ${dto.adminId} not found`);
            }
        }
        const { adminId, ...branchData } = dto;
        const branch = await this.prisma.branch.create({
            data: {
                branchCode,
                name: branchData.name,
                branchType: branchData.branchType,
                phone: branchData.phone,
                email: branchData.email,
                address: branchData.address,
                city: branchData.city,
                district: branchData.district,
                state: branchData.state,
                pincode: branchData.pincode,
                ...(adminId && {
                    admins: {
                        connect: { id: adminId },
                    },
                }),
            },
            include: {
                admins: true,
                _count: {
                    select: {
                        admins: true,
                        members: true,
                    },
                },
            },
        });
        if (this.notificationsService) {
            try {
                await this.notificationsService.createNotification({
                    title: 'Branch Created',
                    message: `New branch "${branch.name}" (${branch.branchCode}) has been created.`,
                    type: 'BRANCH_ACTIVITY',
                    triggeredById: userId,
                    branchId: branch.id,
                });
            }
            catch {
            }
        }
        return branch;
    }
    async findOne(id) {
        const branch = await this.prisma.branch.findUnique({
            where: { id },
            include: {
                admins: {
                    include: {
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
                },
                _count: {
                    select: {
                        admins: true,
                        members: true,
                        bookings: true,
                    },
                },
            },
        });
        if (!branch) {
            throw new common_1.NotFoundException(`Branch with id ${id} not found`);
        }
        const billingCount = await this.prisma.billing.count({
            where: {
                booking: {
                    branchId: id,
                },
            },
        });
        return {
            ...branch,
            operationalSummary: {
                adminCount: branch._count.admins,
                memberCount: branch._count.members,
                bookingCount: branch._count.bookings,
                billingCount,
            },
        };
    }
    async update(id, dto) {
        const branch = await this.prisma.branch.findUnique({ where: { id } });
        if (!branch) {
            throw new common_1.NotFoundException(`Branch with id ${id} not found`);
        }
        const { adminId, ...branchData } = dto;
        const updated = await this.prisma.branch.update({
            where: { id },
            data: {
                ...(branchData.name !== undefined && { name: branchData.name }),
                ...(branchData.branchType !== undefined && {
                    branchType: branchData.branchType,
                }),
                ...(branchData.phone !== undefined && { phone: branchData.phone }),
                ...(branchData.email !== undefined && { email: branchData.email }),
                ...(branchData.address !== undefined && {
                    address: branchData.address,
                }),
                ...(branchData.city !== undefined && { city: branchData.city }),
                ...(branchData.district !== undefined && {
                    district: branchData.district,
                }),
                ...(branchData.state !== undefined && { state: branchData.state }),
                ...(branchData.pincode !== undefined && {
                    pincode: branchData.pincode,
                }),
                ...(adminId && {
                    admins: {
                        connect: { id: adminId },
                    },
                }),
            },
            include: {
                _count: {
                    select: {
                        admins: true,
                        members: true,
                    },
                },
            },
        });
        return updated;
    }
    async updateStatus(id, status) {
        const branch = await this.prisma.branch.findUnique({ where: { id } });
        if (!branch) {
            throw new common_1.NotFoundException(`Branch with id ${id} not found`);
        }
        if (!Object.values(client_1.BranchStatus).includes(status)) {
            throw new common_1.BadRequestException(`Invalid status: ${status}`);
        }
        return this.prisma.branch.update({
            where: { id },
            data: { status },
        });
    }
};
exports.BranchesService = BranchesService;
exports.BranchesService = BranchesService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], BranchesService);
//# sourceMappingURL=branches.service.js.map