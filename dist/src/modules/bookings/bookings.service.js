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
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const id_generator_util_1 = require("../../common/utils/id-generator.util");
const pdf_service_1 = require("../pdf/pdf.service");
const BOOKING_TO_WORKFLOW = {
    [client_1.BookingStatus.BOOKING_INITIATED]: client_1.WorkflowStatus.BOOKING_INITIATED,
    [client_1.BookingStatus.TOKEN_RECEIVED]: client_1.WorkflowStatus.TOKEN_RECEIVED,
    [client_1.BookingStatus.ADVANCE_PAYMENT]: client_1.WorkflowStatus.ADVANCE_PAYMENT,
    [client_1.BookingStatus.REGISTRATION_PENDING]: client_1.WorkflowStatus.REGISTRATION_PENDING,
    [client_1.BookingStatus.FINAL_SETTLEMENT_PENDING]: client_1.WorkflowStatus.FINAL_SETTLEMENT_PENDING,
    [client_1.BookingStatus.COMPLETED]: client_1.WorkflowStatus.COMPLETED,
    [client_1.BookingStatus.CANCELLED]: client_1.WorkflowStatus.AVAILABLE,
};
let BookingsService = class BookingsService {
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
        const where = {};
        if (user.role === client_1.Role.ADMIN) {
            where.branchId = user.admin?.branchId;
        }
        if (filters.status) {
            where.status = filters.status;
        }
        if (filters.propertyId) {
            where.propertyId = filters.propertyId;
        }
        if (filters.branchId && user.role === client_1.Role.SUPER_ADMIN) {
            where.branchId = filters.branchId;
        }
        if (filters.search) {
            const searchTerm = filters.search;
            where.OR = [
                { bookingId: { contains: searchTerm, mode: 'insensitive' } },
                { applicantName: { contains: searchTerm, mode: 'insensitive' } },
                { cellNumber: { contains: searchTerm, mode: 'insensitive' } },
                { projectName: { contains: searchTerm, mode: 'insensitive' } },
                { plotNumber: { contains: searchTerm, mode: 'insensitive' } },
            ];
        }
        const [data, total] = await Promise.all([
            this.prisma.booking.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    property: {
                        select: {
                            id: true,
                            propertyName: true,
                            plotNumber: true,
                        },
                    },
                    branch: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    payments: {
                        select: {
                            totalAmount: true,
                            paymentMethod: true,
                        },
                    },
                },
            }),
            this.prisma.booking.count({ where }),
        ]);
        const enriched = data.map((booking) => ({
            ...booking,
            totalPaid: booking.payments.reduce((sum, p) => sum + p.totalAmount, 0),
        }));
        return { data: enriched, total, page, limit };
    }
    async create(dto, user) {
        let branchId;
        if (user.role === client_1.Role.ADMIN) {
            if (!user.admin?.branchId) {
                throw new common_1.BadRequestException('Admin does not have an associated branch');
            }
            branchId = user.admin.branchId;
        }
        else {
            if (!dto.branchId) {
                throw new common_1.BadRequestException('SUPER_ADMIN must supply branchId when creating a booking');
            }
            branchId = dto.branchId;
        }
        return this.prisma.$transaction(async (tx) => {
            const property = await tx.property.findUnique({
                where: { id: dto.propertyId },
            });
            if (!property) {
                throw new common_1.NotFoundException(`Property with id ${dto.propertyId} not found`);
            }
            const count = await tx.booking.count();
            const bookingId = (0, id_generator_util_1.generateBookingId)(count + 1);
            const booking = await tx.booking.create({
                data: {
                    bookingId,
                    propertyId: dto.propertyId,
                    branchId,
                    applicantName: dto.applicantName,
                    relation: dto.relation,
                    applicantAddress: dto.applicantAddress,
                    pinCode: dto.pinCode,
                    cellNumber: dto.cellNumber,
                    dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
                    weddingDay: dto.weddingDay ? new Date(dto.weddingDay) : undefined,
                    projectName: dto.projectName,
                    plotNumber: dto.plotNumber,
                    squareFeet: dto.squareFeet,
                    bookingDate: new Date(dto.bookingDate),
                    edDdSmBmName: dto.edDdSmBmName,
                    referenceCode: dto.referenceCode,
                    directorName: dto.directorName,
                    signatureUrl: dto.signatureUrl,
                    status: client_1.BookingStatus.BOOKING_INITIATED,
                },
            });
            if (dto.payments && dto.payments.length > 0) {
                await tx.bookingPayment.createMany({
                    data: dto.payments.map((p) => ({
                        bookingId: booking.id,
                        bankName: p.bankName,
                        favourOf: p.favourOf,
                        chequeNumber: p.chequeNumber,
                        chequeDate: p.chequeDate ? new Date(p.chequeDate) : undefined,
                        gpayReference: p.gpayReference,
                        cashAmount: p.cashAmount,
                        totalAmount: p.totalAmount,
                        paymentMethod: p.paymentMethod,
                    })),
                });
            }
            if (dto.denominations && dto.denominations.length > 0) {
                await tx.bookingDenomination.createMany({
                    data: dto.denominations.map((d) => ({
                        bookingId: booking.id,
                        denomination: d.denomination,
                        count: d.count,
                        amount: d.amount,
                    })),
                });
            }
            await tx.property.update({
                where: { id: dto.propertyId },
                data: { workflowStatus: client_1.WorkflowStatus.BOOKING_INITIATED },
            });
            await tx.workflowHistory.create({
                data: {
                    entityType: 'PROPERTY',
                    entityId: dto.propertyId,
                    fromStatus: client_1.WorkflowStatus.AVAILABLE,
                    toStatus: client_1.WorkflowStatus.BOOKING_INITIATED,
                    remarks: `Booking initiated by ${booking.applicantName}`,
                    performedBy: user.id,
                },
            });
            await tx.workflowHistory.create({
                data: {
                    entityType: 'BOOKING',
                    entityId: booking.id,
                    fromStatus: null,
                    toStatus: client_1.BookingStatus.BOOKING_INITIATED,
                    remarks: 'Booking created',
                    performedBy: user.id,
                },
            });
            return tx.booking.findUnique({
                where: { id: booking.id },
                include: {
                    payments: true,
                    denominations: true,
                    property: {
                        select: {
                            id: true,
                            propertyName: true,
                            plotNumber: true,
                            workflowStatus: true,
                        },
                    },
                    branch: {
                        select: { id: true, name: true },
                    },
                },
            });
        });
    }
    async findOne(id) {
        const booking = await this.prisma.booking.findUnique({
            where: { id },
            include: {
                property: true,
                branch: {
                    select: { id: true, name: true, branchCode: true },
                },
                payments: true,
                denominations: true,
                billing: true,
                workflowHistory: {
                    orderBy: { createdAt: 'asc' },
                },
                documents: true,
            },
        });
        if (!booking) {
            throw new common_1.NotFoundException(`Booking with id ${id} not found`);
        }
        return booking;
    }
    async update(id, dto, user) {
        const booking = await this.prisma.booking.findUnique({ where: { id } });
        if (!booking) {
            throw new common_1.NotFoundException(`Booking with id ${id} not found`);
        }
        if (user.role === client_1.Role.ADMIN &&
            booking.status === client_1.BookingStatus.COMPLETED) {
            throw new common_1.ForbiddenException('Cannot edit a completed booking');
        }
        if (user.role === client_1.Role.ADMIN && booking.branchId !== user.admin?.branchId) {
            throw new common_1.ForbiddenException('You do not have permission to edit this booking');
        }
        return this.prisma.$transaction(async (tx) => {
            await tx.booking.update({
                where: { id },
                data: {
                    ...(dto.applicantName !== undefined && {
                        applicantName: dto.applicantName,
                    }),
                    ...(dto.relation !== undefined && { relation: dto.relation }),
                    ...(dto.applicantAddress !== undefined && {
                        applicantAddress: dto.applicantAddress,
                    }),
                    ...(dto.pinCode !== undefined && { pinCode: dto.pinCode }),
                    ...(dto.cellNumber !== undefined && { cellNumber: dto.cellNumber }),
                    ...(dto.dateOfBirth !== undefined && {
                        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
                    }),
                    ...(dto.weddingDay !== undefined && {
                        weddingDay: dto.weddingDay ? new Date(dto.weddingDay) : null,
                    }),
                    ...(dto.projectName !== undefined && {
                        projectName: dto.projectName,
                    }),
                    ...(dto.plotNumber !== undefined && { plotNumber: dto.plotNumber }),
                    ...(dto.squareFeet !== undefined && { squareFeet: dto.squareFeet }),
                    ...(dto.bookingDate !== undefined && {
                        bookingDate: new Date(dto.bookingDate),
                    }),
                    ...(dto.edDdSmBmName !== undefined && {
                        edDdSmBmName: dto.edDdSmBmName,
                    }),
                    ...(dto.referenceCode !== undefined && {
                        referenceCode: dto.referenceCode,
                    }),
                    ...(dto.directorName !== undefined && {
                        directorName: dto.directorName,
                    }),
                    ...(dto.signatureUrl !== undefined && {
                        signatureUrl: dto.signatureUrl,
                    }),
                },
            });
            if (dto.payments !== undefined) {
                await tx.bookingPayment.deleteMany({ where: { bookingId: id } });
                if (dto.payments.length > 0) {
                    await tx.bookingPayment.createMany({
                        data: dto.payments.map((p) => ({
                            bookingId: id,
                            bankName: p.bankName,
                            favourOf: p.favourOf,
                            chequeNumber: p.chequeNumber,
                            chequeDate: p.chequeDate ? new Date(p.chequeDate) : undefined,
                            gpayReference: p.gpayReference,
                            cashAmount: p.cashAmount,
                            totalAmount: p.totalAmount,
                            paymentMethod: p.paymentMethod,
                        })),
                    });
                }
            }
            if (dto.denominations !== undefined) {
                await tx.bookingDenomination.deleteMany({ where: { bookingId: id } });
                if (dto.denominations.length > 0) {
                    await tx.bookingDenomination.createMany({
                        data: dto.denominations.map((d) => ({
                            bookingId: id,
                            denomination: d.denomination,
                            count: d.count,
                            amount: d.amount,
                        })),
                    });
                }
            }
            return tx.booking.findUnique({
                where: { id },
                include: {
                    payments: true,
                    denominations: true,
                    property: {
                        select: { id: true, propertyName: true, plotNumber: true },
                    },
                    branch: {
                        select: { id: true, name: true },
                    },
                },
            });
        });
    }
    async updateStatus(id, status, userId) {
        const booking = await this.prisma.booking.findUnique({ where: { id } });
        if (!booking) {
            throw new common_1.NotFoundException(`Booking with id ${id} not found`);
        }
        if (!Object.values(client_1.BookingStatus).includes(status)) {
            throw new common_1.BadRequestException(`Invalid booking status: ${status}`);
        }
        const previousStatus = booking.status;
        const newWorkflowStatus = BOOKING_TO_WORKFLOW[status];
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.booking.update({
                where: { id },
                data: { status },
            });
            await tx.property.update({
                where: { id: booking.propertyId },
                data: { workflowStatus: newWorkflowStatus },
            });
            await tx.workflowHistory.create({
                data: {
                    entityType: 'BOOKING',
                    entityId: id,
                    fromStatus: previousStatus,
                    toStatus: status,
                    remarks: `Status updated from ${previousStatus} to ${status}`,
                    performedBy: userId,
                },
            });
            await tx.workflowHistory.create({
                data: {
                    entityType: 'PROPERTY',
                    entityId: booking.propertyId,
                    fromStatus: null,
                    toStatus: newWorkflowStatus,
                    remarks: `Property workflow updated due to booking status change to ${status}`,
                    performedBy: userId,
                },
            });
            return updated;
        });
    }
    async generatePdf(id) {
        if (!this.pdfService) {
            throw new common_1.ServiceUnavailableException('PDF service is not available');
        }
        const booking = await this.prisma.booking.findUnique({
            where: { id },
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
                payments: true,
                denominations: true,
                workflowHistory: { orderBy: { createdAt: 'asc' } },
            },
        });
        if (!booking) {
            throw new common_1.NotFoundException(`Booking with id ${id} not found`);
        }
        const pdfData = {
            bookingId: booking.bookingId,
            bookingDate: booking.bookingDate.toISOString().split('T')[0],
            applicantName: booking.applicantName,
            relation: booking.relation ?? '',
            applicantAddress: booking.applicantAddress ?? '',
            pinCode: booking.pinCode ?? '',
            cellNumber: booking.cellNumber,
            dateOfBirth: booking.dateOfBirth
                ? booking.dateOfBirth.toISOString().split('T')[0]
                : undefined,
            weddingDay: booking.weddingDay
                ? booking.weddingDay.toISOString().split('T')[0]
                : undefined,
            projectName: booking.projectName,
            plotNumber: booking.plotNumber,
            squareFeet: booking.squareFeet ?? undefined,
            edDdSmBmName: booking.edDdSmBmName ?? undefined,
            referenceCode: booking.referenceCode ?? undefined,
            directorName: booking.directorName ?? undefined,
            signatureUrl: booking.signatureUrl ?? undefined,
            payments: booking.payments.map((p) => ({
                paymentMethod: p.paymentMethod,
                bankName: p.bankName ?? undefined,
                chequeNumber: p.chequeNumber ?? undefined,
                gpayReference: p.gpayReference ?? undefined,
                cashAmount: p.cashAmount ?? undefined,
                totalAmount: p.totalAmount,
            })),
            denominations: booking.denominations.map((d) => ({
                denomination: d.denomination,
                count: d.count,
                amount: d.amount,
            })),
        };
        return this.pdfService.generateBookingPdf(pdfData);
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pdf_service_1.PdfService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map