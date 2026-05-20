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
exports.TopPerformersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const TOP_PERFORMERS_FREEZE_KEY = 'top_performers_frozen';
let TopPerformersService = class TopPerformersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        const [performers, freezeSetting] = await Promise.all([
            this.prisma.topPerformer.findMany({
                orderBy: [{ role: 'asc' }, { displayOrder: 'asc' }, { rank: 'asc' }],
                include: {
                    member: {
                        select: {
                            id: true,
                            memberId: true,
                            fullName: true,
                            role: true,
                            status: true,
                            branch: {
                                select: { id: true, name: true },
                            },
                        },
                    },
                },
            }),
            this.prisma.systemSetting.findUnique({
                where: { key: TOP_PERFORMERS_FREEZE_KEY },
            }),
        ]);
        const froze = freezeSetting?.value === 'true';
        const groupMap = new Map();
        for (const performer of performers) {
            const roleKey = performer.role;
            if (!groupMap.has(roleKey)) {
                groupMap.set(roleKey, []);
            }
            groupMap.get(roleKey).push(performer);
        }
        const grouped = Array.from(groupMap.entries()).map(([role, items]) => ({
            role,
            items,
        }));
        return { froze, performers: grouped };
    }
    async create(dto) {
        const member = await this.prisma.member.findUnique({
            where: { id: dto.memberId },
        });
        if (!member)
            throw new common_1.NotFoundException('Member not found');
        return this.prisma.topPerformer.create({
            data: {
                memberId: dto.memberId,
                role: dto.role,
                rank: dto.rank,
                displayOrder: dto.displayOrder,
                taggedCount: dto.taggedCount ?? 0,
                propertiesCount: dto.propertiesCount ?? 0,
            },
            include: {
                member: {
                    select: {
                        id: true,
                        memberId: true,
                        fullName: true,
                        role: true,
                        status: true,
                        branch: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
        });
    }
    async update(id, dto) {
        const existing = await this.prisma.topPerformer.findUnique({
            where: { id },
        });
        if (!existing)
            throw new common_1.NotFoundException('Top performer record not found');
        if (dto.memberId) {
            const member = await this.prisma.member.findUnique({
                where: { id: dto.memberId },
            });
            if (!member)
                throw new common_1.NotFoundException('Member not found');
        }
        return this.prisma.topPerformer.update({
            where: { id },
            data: {
                ...(dto.memberId !== undefined && { memberId: dto.memberId }),
                ...(dto.role !== undefined && { role: dto.role }),
                ...(dto.rank !== undefined && { rank: dto.rank }),
                ...(dto.displayOrder !== undefined && {
                    displayOrder: dto.displayOrder,
                }),
                ...(dto.taggedCount !== undefined && { taggedCount: dto.taggedCount }),
                ...(dto.propertiesCount !== undefined && {
                    propertiesCount: dto.propertiesCount,
                }),
            },
            include: {
                member: {
                    select: {
                        id: true,
                        memberId: true,
                        fullName: true,
                        role: true,
                        status: true,
                        branch: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
        });
    }
    async remove(id) {
        const existing = await this.prisma.topPerformer.findUnique({
            where: { id },
        });
        if (!existing)
            throw new common_1.NotFoundException('Top performer record not found');
        await this.prisma.topPerformer.delete({ where: { id } });
        return { message: 'Top performer deleted successfully' };
    }
    async reorder(dto) {
        await this.prisma.$transaction(dto.items.map((item) => this.prisma.topPerformer.update({
            where: { id: item.id },
            data: {
                rank: item.rank,
                displayOrder: item.displayOrder,
            },
        })));
        return { message: 'Top performers reordered successfully' };
    }
    async getFreezeState() {
        const setting = await this.prisma.systemSetting.findUnique({
            where: { key: TOP_PERFORMERS_FREEZE_KEY },
        });
        return { frozen: setting?.value === 'true' };
    }
    async toggleFreeze(frozen) {
        const setting = await this.prisma.systemSetting.upsert({
            where: { key: TOP_PERFORMERS_FREEZE_KEY },
            update: { value: frozen.toString() },
            create: { key: TOP_PERFORMERS_FREEZE_KEY, value: frozen.toString() },
        });
        return { frozen: setting.value === 'true' };
    }
};
exports.TopPerformersService = TopPerformersService;
exports.TopPerformersService = TopPerformersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TopPerformersService);
//# sourceMappingURL=top-performers.service.js.map