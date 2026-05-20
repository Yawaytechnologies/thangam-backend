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
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const id_generator_util_1 = require("../../common/utils/id-generator.util");
const amount_words_util_1 = require("../../common/utils/amount-words.util");
const pdf_service_1 = require("../pdf/pdf.service");
let BillingService = class BillingService {
    prisma;
    pdfService;
    constructor(prisma, pdfService) {
        this.prisma = prisma;
        this.pdfService = pdfService;
    }
    async findAll(user, filters) {
        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;
        const skip = (page - 1) * limit;
        const andClauses = [];
        if (user.role === client_1.Role.ADMIN) {
            andClauses.push({ booking: { branchId: user.admin?.branchId } });
        }
        if (filters.branchId && user.role === client_1.Role.SUPER_ADMIN) {
            andClauses.push({ booking: { branchId: filters.branchId } });
        }
        if (filters.status) {
            andClauses.push({ status: filters.status });
        }
        if (filters.paymentMethod) {
            andClauses.push({ paymentMethod: filters.paymentMethod });
        }
        if (filters.search) {
            const searchTerm = filters.search;
            andClauses.push({
                OR: [
                    { billingId: { contains: searchTerm, mode: 'insensitive' } },
                    { buyerName: { contains: searchTerm, mode: 'insensitive' } },
                    {
                        booking: {
                            bookingId: { contains: searchTerm, mode: 'insensitive' },
                        },
                    },
                    {
                        booking: {
                            projectName: { contains: searchTerm, mode: 'insensitive' },
                        },
                    },
                    {
                        booking: {
                            plotNumber: { contains: searchTerm, mode: 'insensitive' },
                        },
                    },
                ],
            });
        }
        const where = andClauses.length > 0 ? { AND: andClauses } : {};
        const [data, total] = await Promise.all([
            this.prisma.billing.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    booking: {
                        select: {
                            id: true,
                            bookingId: true,
                            projectName: true,
                            plotNumber: true,
                            applicantName: true,
                            branchId: true,
                        },
                    },
                },
            }),
            this.prisma.billing.count({ where }),
        ]);
        return { data, total, page, limit };
    }
    async create(dto, user) {
        return this.prisma.$transaction(async (tx) => {
            const booking = await tx.booking.findUnique({
                where: { id: dto.bookingId },
                include: {
                    branch: { select: { id: true, name: true } },
                },
            });
            if (!booking) {
                throw new common_1.NotFoundException(`Booking with id ${dto.bookingId} not found`);
            }
            if (user.role === client_1.Role.ADMIN &&
                booking.branchId !== user.admin?.branchId) {
                throw new common_1.ForbiddenException('You do not have permission to create billing for this booking');
            }
            const count = await tx.billing.count();
            const billingId = (0, id_generator_util_1.generateBillingId)(count + 1);
            const amountInWords = (0, amount_words_util_1.numberToWords)(dto.amountInNumbers);
            const billing = await tx.billing.create({
                data: {
                    billingId,
                    bookingId: dto.bookingId,
                    buyerName: dto.buyerName,
                    buyerAddress: dto.buyerAddress,
                    buyerPhone: dto.buyerPhone,
                    orderNumber: dto.orderNumber,
                    billingNumber: dto.billingNumber,
                    billingDate: new Date(dto.billingDate),
                    paymentMethod: dto.paymentMethod,
                    amountInNumbers: dto.amountInNumbers,
                    amountInWords,
                    totalReceived: dto.totalReceived,
                    totalBalance: dto.totalBalance ?? 0,
                    operationalNotes: dto.operationalNotes,
                    settlementNotes: dto.settlementNotes,
                    termsConditions: dto.termsConditions,
                    signatureUrl: dto.signatureUrl,
                    status: client_1.BillingStatus.PENDING,
                },
            });
            await tx.workflowHistory.create({
                data: {
                    entityType: 'BILLING',
                    entityId: billing.id,
                    fromStatus: null,
                    toStatus: client_1.BillingStatus.PENDING,
                    remarks: 'Billing record created',
                    performedBy: user.id,
                },
            });
            return tx.billing.findUnique({
                where: { id: billing.id },
                include: {
                    booking: {
                        select: {
                            id: true,
                            bookingId: true,
                            projectName: true,
                            plotNumber: true,
                            applicantName: true,
                            branchId: true,
                            branch: { select: { id: true, name: true } },
                        },
                    },
                },
            });
        });
    }
    async findOne(id) {
        const billing = await this.prisma.billing.findUnique({
            where: { id },
            include: {
                booking: {
                    include: {
                        property: true,
                        branch: { select: { id: true, name: true, branchCode: true } },
                    },
                },
                workflowHistory: {
                    orderBy: { createdAt: 'asc' },
                },
                documents: true,
            },
        });
        if (!billing) {
            throw new common_1.NotFoundException(`Billing record with id ${id} not found`);
        }
        return billing;
    }
    async update(id, dto, user) {
        const billing = await this.prisma.billing.findUnique({
            where: { id },
            include: {
                booking: { select: { branchId: true } },
            },
        });
        if (!billing) {
            throw new common_1.NotFoundException(`Billing record with id ${id} not found`);
        }
        if (user.role === client_1.Role.ADMIN &&
            billing.status === client_1.BillingStatus.COMPLETED) {
            throw new common_1.ForbiddenException('Cannot edit a completed billing record');
        }
        if (user.role === client_1.Role.ADMIN &&
            billing.booking.branchId !== user.admin?.branchId) {
            throw new common_1.ForbiddenException('You do not have permission to edit this billing record');
        }
        let amountInWords;
        if (dto.amountInNumbers !== undefined) {
            amountInWords = (0, amount_words_util_1.numberToWords)(dto.amountInNumbers);
        }
        return this.prisma.billing.update({
            where: { id },
            data: {
                ...(dto.paymentMethod !== undefined && {
                    paymentMethod: dto.paymentMethod,
                }),
                ...(dto.amountInNumbers !== undefined && {
                    amountInNumbers: dto.amountInNumbers,
                }),
                ...(amountInWords !== undefined && { amountInWords }),
                ...(dto.totalReceived !== undefined && {
                    totalReceived: dto.totalReceived,
                }),
                ...(dto.operationalNotes !== undefined && {
                    operationalNotes: dto.operationalNotes,
                }),
                ...(dto.settlementNotes !== undefined && {
                    settlementNotes: dto.settlementNotes,
                }),
                ...(dto.termsConditions !== undefined && {
                    termsConditions: dto.termsConditions,
                }),
                ...(dto.status !== undefined && { status: dto.status }),
            },
            include: {
                booking: {
                    select: {
                        id: true,
                        bookingId: true,
                        projectName: true,
                        plotNumber: true,
                        applicantName: true,
                    },
                },
            },
        });
    }
    async updateStatus(id, status, userId) {
        const billing = await this.prisma.billing.findUnique({ where: { id } });
        if (!billing) {
            throw new common_1.NotFoundException(`Billing record with id ${id} not found`);
        }
        if (!Object.values(client_1.BillingStatus).includes(status)) {
            throw new common_1.BadRequestException(`Invalid billing status: ${status}`);
        }
        const previousStatus = billing.status;
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.billing.update({
                where: { id },
                data: { status },
            });
            await tx.workflowHistory.create({
                data: {
                    entityType: 'BILLING',
                    entityId: id,
                    fromStatus: previousStatus,
                    toStatus: status,
                    remarks: `Status updated from ${previousStatus} to ${status}`,
                    performedBy: userId,
                },
            });
            return updated;
        });
    }
    async generatePdf(id, type) {
        if (!this.pdfService) {
            throw new common_1.ServiceUnavailableException('PDF service is not available');
        }
        const billing = await this.prisma.billing.findUnique({
            where: { id },
            include: {
                booking: {
                    include: {
                        property: true,
                        branch: {
                            select: {
                                id: true,
                                name: true,
                                branchCode: true,
                                address: true,
                                phone: true,
                            },
                        },
                    },
                },
                workflowHistory: { orderBy: { createdAt: 'asc' } },
            },
        });
        if (!billing) {
            throw new common_1.NotFoundException(`Billing record with id ${id} not found`);
        }
        const pdfData = {
            billingId: billing.billingId,
            bookingId: billing.booking.bookingId,
            billingDate: billing.billingDate.toISOString().split('T')[0],
            orderNumber: billing.orderNumber ?? undefined,
            billingNumber: billing.billingNumber ?? undefined,
            buyerName: billing.buyerName,
            buyerAddress: billing.buyerAddress ?? undefined,
            buyerPhone: billing.buyerPhone,
            projectName: billing.booking.projectName,
            plotNumber: billing.booking.plotNumber,
            squareFeet: billing.booking.squareFeet ?? undefined,
            bookingStatus: billing.booking.status,
            paymentMethod: billing.paymentMethod,
            amountInNumbers: billing.amountInNumbers,
            amountInWords: billing.amountInWords,
            totalReceived: billing.totalReceived,
            totalBalance: billing.totalBalance,
            operationalNotes: billing.operationalNotes ?? undefined,
            settlementNotes: billing.settlementNotes ?? undefined,
            termsConditions: billing.termsConditions ?? undefined,
            signatureUrl: billing.signatureUrl ?? undefined,
        };
        if (type === 'estimate') {
            return this.pdfService.generateEstimatePdf(pdfData);
        }
        return this.pdfService.generateBillingPdf(pdfData);
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pdf_service_1.PdfService])
], BillingService);
//# sourceMappingURL=billing.service.js.map