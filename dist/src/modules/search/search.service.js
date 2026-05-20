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
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let SearchService = class SearchService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async globalSearch(query) {
        const q = query.trim();
        const [members, branches, admins, properties, bookings, billing, notifications,] = await Promise.all([
            this.prisma.member.findMany({
                where: {
                    OR: [
                        { fullName: { contains: q, mode: 'insensitive' } },
                        { memberId: { contains: q, mode: 'insensitive' } },
                        { phone: { contains: q, mode: 'insensitive' } },
                    ],
                },
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    memberId: true,
                    fullName: true,
                    role: true,
                    phone: true,
                    status: true,
                    branchId: true,
                    createdAt: true,
                },
            }),
            this.prisma.branch.findMany({
                where: {
                    OR: [
                        { name: { contains: q, mode: 'insensitive' } },
                        { branchCode: { contains: q, mode: 'insensitive' } },
                        { city: { contains: q, mode: 'insensitive' } },
                    ],
                },
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    branchCode: true,
                    name: true,
                    city: true,
                    status: true,
                    createdAt: true,
                },
            }),
            this.prisma.admin.findMany({
                where: {
                    OR: [
                        { fullName: { contains: q, mode: 'insensitive' } },
                        { adminId: { contains: q, mode: 'insensitive' } },
                        { phone: { contains: q, mode: 'insensitive' } },
                        { email: { contains: q, mode: 'insensitive' } },
                    ],
                },
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    adminId: true,
                    fullName: true,
                    phone: true,
                    email: true,
                    status: true,
                    branchId: true,
                    createdAt: true,
                },
            }),
            this.prisma.property.findMany({
                where: {
                    OR: [
                        { propertyName: { contains: q, mode: 'insensitive' } },
                        { propertyCode: { contains: q, mode: 'insensitive' } },
                        { plotNumber: { contains: q, mode: 'insensitive' } },
                        { projectName: { contains: q, mode: 'insensitive' } },
                    ],
                },
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    propertyId: true,
                    propertyName: true,
                    propertyCode: true,
                    projectName: true,
                    plotNumber: true,
                    workflowStatus: true,
                    createdAt: true,
                },
            }),
            this.prisma.booking.findMany({
                where: {
                    OR: [
                        { bookingId: { contains: q, mode: 'insensitive' } },
                        { applicantName: { contains: q, mode: 'insensitive' } },
                        { cellNumber: { contains: q, mode: 'insensitive' } },
                        { projectName: { contains: q, mode: 'insensitive' } },
                    ],
                },
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    bookingId: true,
                    applicantName: true,
                    cellNumber: true,
                    projectName: true,
                    plotNumber: true,
                    status: true,
                    bookingDate: true,
                    branchId: true,
                    createdAt: true,
                },
            }),
            this.prisma.billing.findMany({
                where: {
                    OR: [
                        { billingId: { contains: q, mode: 'insensitive' } },
                        { buyerName: { contains: q, mode: 'insensitive' } },
                        { buyerPhone: { contains: q, mode: 'insensitive' } },
                    ],
                },
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    billingId: true,
                    buyerName: true,
                    buyerPhone: true,
                    amountInNumbers: true,
                    totalBalance: true,
                    status: true,
                    createdAt: true,
                },
            }),
            this.prisma.notification.findMany({
                where: {
                    title: { contains: q, mode: 'insensitive' },
                },
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    message: true,
                    type: true,
                    priority: true,
                    relatedModule: true,
                    relatedEntityId: true,
                    createdAt: true,
                },
            }),
        ]);
        return {
            members,
            branches,
            admins,
            properties,
            bookings,
            billing,
            notifications,
        };
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SearchService);
//# sourceMappingURL=search.service.js.map