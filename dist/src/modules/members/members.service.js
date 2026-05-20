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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcryptjs"));
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const documents_service_1 = require("../documents/documents.service");
const id_generator_util_1 = require("../../common/utils/id-generator.util");
let MembersService = class MembersService {
    prisma;
    documentsService;
    constructor(prisma, documentsService) {
        this.prisma = prisma;
        this.documentsService = documentsService;
    }
    getDownlineRoles(role) {
        const hierarchy = {
            [client_1.Role.DIRECTOR]: [
                client_1.Role.EXECUTIVE_DIRECTOR,
                client_1.Role.DEPUTY_DIRECTOR,
                client_1.Role.SENIOR_MANAGER,
                client_1.Role.BUSINESS_MANAGER,
                client_1.Role.AGENT,
            ],
            [client_1.Role.EXECUTIVE_DIRECTOR]: [
                client_1.Role.DEPUTY_DIRECTOR,
                client_1.Role.SENIOR_MANAGER,
                client_1.Role.BUSINESS_MANAGER,
                client_1.Role.AGENT,
            ],
            [client_1.Role.DEPUTY_DIRECTOR]: [
                client_1.Role.SENIOR_MANAGER,
                client_1.Role.BUSINESS_MANAGER,
                client_1.Role.AGENT,
            ],
            [client_1.Role.SENIOR_MANAGER]: [client_1.Role.BUSINESS_MANAGER, client_1.Role.AGENT],
            [client_1.Role.BUSINESS_MANAGER]: [client_1.Role.AGENT],
            [client_1.Role.AGENT]: [],
        };
        return hierarchy[role] ?? [];
    }
    async findAll(user, filters) {
        const { search, role, status, branchId, page = 1, limit = 20 } = filters;
        const skip = (page - 1) * limit;
        const where = {};
        if (user.role === client_1.Role.SUPER_ADMIN) {
            if (branchId)
                where.branchId = branchId;
        }
        else if (user.role === client_1.Role.ADMIN) {
            where.branchId = user.admin?.branchId;
        }
        else {
            const memberRole = user.member?.role;
            if (!memberRole) {
                return { data: [], total: 0, page, limit };
            }
            if (memberRole === client_1.Role.AGENT) {
                where.id = user.member?.id;
            }
            else {
                const downlineRoles = this.getDownlineRoles(memberRole);
                where.role = { in: downlineRoles };
                where.branchId = user.member?.branchId;
            }
        }
        if (role && !where.role) {
            where.role = role;
        }
        else if (role && where.role?.in) {
            where.role = {
                in: where.role.in.filter((r) => r === role),
            };
        }
        if (status)
            where.status = status;
        if (search) {
            where.OR = [
                { fullName: { contains: search, mode: 'insensitive' } },
                { memberId: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { codeNumber: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [data, total] = await this.prisma.$transaction([
            this.prisma.member.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
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
                    branch: true,
                },
            }),
            this.prisma.member.count({ where }),
        ]);
        return { data, total, page, limit };
    }
    async create(dto, user) {
        let branchId;
        if (user.role === client_1.Role.ADMIN) {
            branchId = user.admin?.branchId;
            if (!branchId) {
                throw new common_1.BadRequestException('Admin is not associated with any branch');
            }
        }
        else if (user.role === client_1.Role.SUPER_ADMIN) {
            branchId = dto.branchId ?? '';
            if (!branchId) {
                throw new common_1.BadRequestException('branchId is required for SUPER_ADMIN');
            }
        }
        else {
            throw new common_1.BadRequestException('You do not have permission to create members');
        }
        const branch = await this.prisma.branch.findUnique({
            where: { id: branchId },
        });
        if (!branch)
            throw new common_1.NotFoundException('Branch not found');
        const existingPhone = await this.prisma.user.findFirst({
            where: { phone: dto.phone },
        });
        if (existingPhone)
            throw new common_1.ConflictException('phone already exists');
        if (dto.email) {
            const existingEmail = await this.prisma.user.findFirst({
                where: { email: dto.email },
            });
            if (existingEmail)
                throw new common_1.ConflictException('email already exists');
        }
        if (dto.aadhaarNumber) {
            const existingAadhaar = await this.prisma.member.findFirst({
                where: { aadhaarNumber: dto.aadhaarNumber },
            });
            if (existingAadhaar)
                throw new common_1.ConflictException('aadhaarNumber already exists');
        }
        if (dto.panNumber) {
            const existingPan = await this.prisma.member.findFirst({
                where: { panNumber: dto.panNumber },
            });
            if (existingPan)
                throw new common_1.ConflictException('panNumber already exists');
        }
        if (dto.reportsToId) {
            const reportsTo = await this.prisma.member.findUnique({
                where: { id: dto.reportsToId },
            });
            if (!reportsTo)
                throw new common_1.NotFoundException('reportsToId member not found');
        }
        const count = await this.prisma.member.count();
        const memberId = (0, id_generator_util_1.generateMemberId)(count + 1);
        const defaultPassword = dto.phone;
        const passwordHash = await bcrypt.hash(defaultPassword, 10);
        const member = await this.prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    role: dto.role,
                    phone: dto.phone,
                    email: dto.email ?? null,
                    passwordHash,
                    status: client_1.UserStatus.ACTIVE,
                },
            });
            const newMember = await tx.member.create({
                data: {
                    memberId,
                    userId: newUser.id,
                    branchId,
                    fullName: dto.fullName,
                    gender: dto.gender ?? null,
                    dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
                    bloodGroup: dto.bloodGroup ?? null,
                    qualification: dto.qualification ?? null,
                    experience: dto.experience ?? null,
                    phone: dto.phone,
                    alternatePhone: dto.alternatePhone ?? null,
                    email: dto.email ?? null,
                    address: dto.address ?? null,
                    city: dto.city ?? null,
                    district: dto.district ?? null,
                    state: dto.state ?? null,
                    pincode: dto.pincode ?? null,
                    panNumber: dto.panNumber ?? null,
                    aadhaarNumber: dto.aadhaarNumber ?? null,
                    voterIdNumber: dto.voterIdNumber ?? null,
                    drivingLicense: dto.drivingLicense ?? null,
                    role: dto.role,
                    introName: dto.introName ?? null,
                    reportsToId: dto.reportsToId ?? null,
                    codeNumber: dto.codeNumber ?? null,
                    nomineeName: dto.nomineeName ?? null,
                    nomineeRelation: dto.nomineeRelation ?? null,
                    nomineePhone: dto.nomineePhone ?? null,
                    bankName: dto.bankName ?? null,
                    accountHolder: dto.accountHolder ?? null,
                    accountNumber: dto.accountNumber ?? null,
                    ifscCode: dto.ifscCode ?? null,
                    bankBranch: dto.bankBranch ?? null,
                    status: client_1.UserStatus.ACTIVE,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            phone: true,
                            role: true,
                            status: true,
                            createdAt: true,
                        },
                    },
                    branch: true,
                },
            });
            return newMember;
        });
        return {
            ...member,
            defaultPassword,
        };
    }
    async findOne(id, _user) {
        const member = await this.prisma.member.findUnique({
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
                branch: true,
                reportsTo: {
                    select: {
                        id: true,
                        memberId: true,
                        fullName: true,
                        role: true,
                        phone: true,
                    },
                },
                documents: {
                    select: {
                        id: true,
                        documentType: true,
                        fileName: true,
                        storagePath: true,
                        mimeType: true,
                        fileSize: true,
                        isVerified: true,
                        uploadedBy: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!member)
            throw new common_1.NotFoundException('Member not found');
        const [directorCount, edCount, ddCount, smCount, bmCount, agentCount] = await Promise.all([
            this.prisma.member.count({
                where: { reportsToId: id, role: client_1.Role.DIRECTOR },
            }),
            this.prisma.member.count({
                where: { reportsToId: id, role: client_1.Role.EXECUTIVE_DIRECTOR },
            }),
            this.prisma.member.count({
                where: { reportsToId: id, role: client_1.Role.DEPUTY_DIRECTOR },
            }),
            this.prisma.member.count({
                where: { reportsToId: id, role: client_1.Role.SENIOR_MANAGER },
            }),
            this.prisma.member.count({
                where: { reportsToId: id, role: client_1.Role.BUSINESS_MANAGER },
            }),
            this.prisma.member.count({
                where: { reportsToId: id, role: client_1.Role.AGENT },
            }),
        ]);
        const profilePhotoUrl = await this.documentsService.getLatestSignedUrl('member', id, 'PROFILE_PHOTO');
        return {
            ...member,
            profilePhotoUrl,
            downlineSummary: {
                directorCount,
                edCount,
                ddCount,
                smCount,
                bmCount,
                agentCount,
                total: directorCount + edCount + ddCount + smCount + bmCount + agentCount,
            },
        };
    }
    async update(id, dto) {
        const member = await this.prisma.member.findUnique({
            where: { id },
            include: { user: true },
        });
        if (!member)
            throw new common_1.NotFoundException('Member not found');
        if (dto.phone && dto.phone !== member.phone) {
            const existing = await this.prisma.user.findFirst({
                where: { phone: dto.phone, NOT: { id: member.userId } },
            });
            if (existing)
                throw new common_1.ConflictException('phone already exists');
        }
        if (dto.email && dto.email !== member.email) {
            const existing = await this.prisma.user.findFirst({
                where: { email: dto.email, NOT: { id: member.userId } },
            });
            if (existing)
                throw new common_1.ConflictException('email already exists');
        }
        if (dto.panNumber && dto.panNumber !== member.panNumber) {
            const existing = await this.prisma.member.findFirst({
                where: { panNumber: dto.panNumber, NOT: { id } },
            });
            if (existing)
                throw new common_1.ConflictException('panNumber already exists');
        }
        if (dto.aadhaarNumber && dto.aadhaarNumber !== member.aadhaarNumber) {
            const existing = await this.prisma.member.findFirst({
                where: { aadhaarNumber: dto.aadhaarNumber, NOT: { id } },
            });
            if (existing)
                throw new common_1.ConflictException('aadhaarNumber already exists');
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            const userUpdate = {};
            if (dto.phone)
                userUpdate.phone = dto.phone;
            if (dto.email !== undefined)
                userUpdate.email = dto.email ?? null;
            if (dto.role)
                userUpdate.role = dto.role;
            if (dto.status)
                userUpdate.status = dto.status;
            if (Object.keys(userUpdate).length > 0) {
                await tx.user.update({
                    where: { id: member.userId },
                    data: userUpdate,
                });
            }
            return tx.member.update({
                where: { id },
                data: {
                    ...(dto.fullName !== undefined && { fullName: dto.fullName }),
                    ...(dto.gender !== undefined && { gender: dto.gender }),
                    ...(dto.dateOfBirth !== undefined && {
                        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
                    }),
                    ...(dto.bloodGroup !== undefined && { bloodGroup: dto.bloodGroup }),
                    ...(dto.qualification !== undefined && {
                        qualification: dto.qualification,
                    }),
                    ...(dto.experience !== undefined && { experience: dto.experience }),
                    ...(dto.phone !== undefined && { phone: dto.phone }),
                    ...(dto.alternatePhone !== undefined && {
                        alternatePhone: dto.alternatePhone,
                    }),
                    ...(dto.email !== undefined && { email: dto.email ?? null }),
                    ...(dto.address !== undefined && { address: dto.address }),
                    ...(dto.city !== undefined && { city: dto.city }),
                    ...(dto.district !== undefined && { district: dto.district }),
                    ...(dto.state !== undefined && { state: dto.state }),
                    ...(dto.pincode !== undefined && { pincode: dto.pincode }),
                    ...(dto.panNumber !== undefined && { panNumber: dto.panNumber }),
                    ...(dto.aadhaarNumber !== undefined && {
                        aadhaarNumber: dto.aadhaarNumber,
                    }),
                    ...(dto.voterIdNumber !== undefined && {
                        voterIdNumber: dto.voterIdNumber,
                    }),
                    ...(dto.drivingLicense !== undefined && {
                        drivingLicense: dto.drivingLicense,
                    }),
                    ...(dto.role !== undefined && { role: dto.role }),
                    ...(dto.introName !== undefined && { introName: dto.introName }),
                    ...(dto.reportsToId !== undefined && {
                        reportsToId: dto.reportsToId ?? null,
                    }),
                    ...(dto.codeNumber !== undefined && { codeNumber: dto.codeNumber }),
                    ...(dto.nomineeName !== undefined && {
                        nomineeName: dto.nomineeName,
                    }),
                    ...(dto.nomineeRelation !== undefined && {
                        nomineeRelation: dto.nomineeRelation,
                    }),
                    ...(dto.nomineePhone !== undefined && {
                        nomineePhone: dto.nomineePhone,
                    }),
                    ...(dto.bankName !== undefined && { bankName: dto.bankName }),
                    ...(dto.accountHolder !== undefined && {
                        accountHolder: dto.accountHolder,
                    }),
                    ...(dto.accountNumber !== undefined && {
                        accountNumber: dto.accountNumber,
                    }),
                    ...(dto.ifscCode !== undefined && { ifscCode: dto.ifscCode }),
                    ...(dto.bankBranch !== undefined && { bankBranch: dto.bankBranch }),
                    ...(dto.status !== undefined && { status: dto.status }),
                    ...(dto.branchId !== undefined && { branchId: dto.branchId }),
                },
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
                    branch: true,
                },
            });
        });
        return updated;
    }
    async updateStatus(id, status) {
        const member = await this.prisma.member.findUnique({ where: { id } });
        if (!member)
            throw new common_1.NotFoundException('Member not found');
        return this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: member.userId },
                data: { status },
            });
            return tx.member.update({
                where: { id },
                data: { status },
                include: {
                    user: {
                        select: { id: true, status: true },
                    },
                },
            });
        });
    }
    async getTeamForMobile(user, filters) {
        const { role, status, page = 1, limit = 20 } = filters;
        const skip = (page - 1) * limit;
        const memberRole = user.member?.role;
        if (!memberRole) {
            return { data: [], total: 0, page, limit };
        }
        if (memberRole === client_1.Role.AGENT) {
            const self = await this.prisma.member.findUnique({
                where: { id: user.member.id },
                include: {
                    user: {
                        select: { id: true, status: true, role: true },
                    },
                    branch: true,
                },
            });
            return {
                data: self ? [self] : [],
                total: self ? 1 : 0,
                page,
                limit,
            };
        }
        const downlineRoles = this.getDownlineRoles(memberRole);
        const where = {
            role: { in: downlineRoles },
            branchId: user.member?.branchId,
        };
        if (role) {
            if (downlineRoles.includes(role)) {
                where.role = role;
            }
            else {
                return { data: [], total: 0, page, limit };
            }
        }
        if (status)
            where.status = status;
        const [data, total] = await this.prisma.$transaction([
            this.prisma.member.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { id: true, status: true, role: true },
                    },
                    branch: { select: { id: true, name: true } },
                    reportsTo: {
                        select: { id: true, fullName: true, role: true },
                    },
                },
            }),
            this.prisma.member.count({ where }),
        ]);
        return { data, total, page, limit };
    }
    async getMemberBottomSheet(memberId) {
        const member = await this.prisma.member.findUnique({
            where: { id: memberId },
            select: {
                id: true,
                memberId: true,
                fullName: true,
                role: true,
                phone: true,
                status: true,
                createdAt: true,
                branch: {
                    select: { id: true, name: true },
                },
                documents: {
                    where: { documentType: 'PROFILE_PHOTO' },
                    select: { storagePath: true, fileName: true },
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!member)
            throw new common_1.NotFoundException('Member not found');
        const profilePhoto = member.documents[0] ?? null;
        let profilePhotoUrl = null;
        if (profilePhoto) {
            try {
                profilePhotoUrl = await this.documentsService.getSignedUrl(profilePhoto.storagePath);
            }
            catch {
                profilePhotoUrl = null;
            }
        }
        return {
            profilePhotoUrl,
            fullName: member.fullName,
            role: member.role,
            memberId: member.memberId,
            phone: member.phone,
            branchName: member.branch?.name ?? null,
            createdAt: member.createdAt,
            status: member.status,
        };
    }
    async uploadProfilePhoto(memberId, file, uploadedBy) {
        const member = await this.prisma.member.findUnique({
            where: { id: memberId },
        });
        if (!member)
            throw new common_1.NotFoundException('Member not found');
        const document = await this.documentsService.upload(file, 'member', memberId, 'PROFILE_PHOTO', uploadedBy);
        const profilePhotoUrl = await this.documentsService.getSignedUrl(document.storagePath);
        return { document, profilePhotoUrl };
    }
};
exports.MembersService = MembersService;
exports.MembersService = MembersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        documents_service_1.DocumentsService])
], MembersService);
//# sourceMappingURL=members.service.js.map