import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
  Optional,
} from '@nestjs/common';
import { BookingStatus, WorkflowStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingFilterDto } from './dto/booking-filter.dto';
import { generateBookingId } from '../../common/utils/id-generator.util';
import { PdfService } from '../pdf/pdf.service';
import { BookingPdfData } from '../pdf/templates/booking-form.template';

const BOOKING_TO_WORKFLOW: Record<BookingStatus, WorkflowStatus> = {
  [BookingStatus.BOOKING_INITIATED]: WorkflowStatus.BOOKING_INITIATED,
  [BookingStatus.TOKEN_RECEIVED]: WorkflowStatus.TOKEN_RECEIVED,
  [BookingStatus.ADVANCE_PAYMENT]: WorkflowStatus.ADVANCE_PAYMENT,
  [BookingStatus.REGISTRATION_PENDING]: WorkflowStatus.REGISTRATION_PENDING,
  [BookingStatus.FINAL_SETTLEMENT_PENDING]:
    WorkflowStatus.FINAL_SETTLEMENT_PENDING,
  [BookingStatus.COMPLETED]: WorkflowStatus.COMPLETED,
  [BookingStatus.CANCELLED]: WorkflowStatus.AVAILABLE,
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly pdfService: PdfService,
  ) {}

  async findAll(user: any, filters: BookingFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Role-based branch restriction
    if (user.role === Role.ADMIN) {
      where.branchId = user.admin?.branchId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.propertyId) {
      where.propertyId = filters.propertyId;
    }

    if (filters.branchId && user.role === Role.SUPER_ADMIN) {
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

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
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

  async create(dto: CreateBookingDto, user: any) {
    // Determine branchId
    let branchId: string;
    if (user.role === Role.ADMIN) {
      if (!user.admin?.branchId) {
        throw new BadRequestException(
          'Admin does not have an associated branch',
        );
      }
      branchId = user.admin.branchId;
    } else {
      // SUPER_ADMIN: use branchId from DTO or throw
      if (!dto.branchId) {
        throw new BadRequestException(
          'SUPER_ADMIN must supply branchId when creating a booking',
        );
      }
      branchId = dto.branchId;
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Verify property exists and is available
      const property = await tx.property.findUnique({
        where: { id: dto.propertyId },
      });
      if (!property) {
        throw new NotFoundException(
          `Property with id ${dto.propertyId} not found`,
        );
      }
      if (property.workflowStatus !== WorkflowStatus.AVAILABLE) {
        throw new ConflictException(
          `Property is not available for booking (current status: ${property.workflowStatus})`,
        );
      }

      // 2. Auto-generate bookingId
      const count = await tx.booking.count();
      const bookingId = generateBookingId(count + 1);

      // 3. Create Booking
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
          status: BookingStatus.BOOKING_INITIATED,
        },
      });

      // 4. Create BookingPayments
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

      // 5. Create BookingDenominations
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

      // 6. Update property workflowStatus to BOOKING_INITIATED
      await tx.property.update({
        where: { id: dto.propertyId },
        data: { workflowStatus: WorkflowStatus.BOOKING_INITIATED },
      });

      // 7. Create WorkflowHistory for property
      await tx.workflowHistory.create({
        data: {
          entityType: 'property',
          entityId: dto.propertyId,
          fromStatus: property.workflowStatus,
          toStatus: WorkflowStatus.BOOKING_INITIATED,
          remarks: `Booking initiated by ${booking.applicantName}`,
          performedBy: user.id,
        },
      });

      // 8. Create WorkflowHistory for booking
      await tx.workflowHistory.create({
        data: {
          entityType: 'booking',
          entityId: booking.id,
          fromStatus: null,
          toStatus: BookingStatus.BOOKING_INITIATED,
          remarks: 'Booking created',
          performedBy: user.id,
        },
      });

      // Return booking with payments + denominations
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

  async findOne(id: string) {
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
      throw new NotFoundException(`Booking with id ${id} not found`);
    }

    return booking;
  }

  async update(id: string, dto: UpdateBookingDto, user: any) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException(`Booking with id ${id} not found`);
    }

    // ADMIN cannot edit completed bookings
    if (
      user.role === Role.ADMIN &&
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new ForbiddenException('Cannot edit a completed booking');
    }

    // ADMIN branch restriction
    if (user.role === Role.ADMIN && booking.branchId !== user.admin?.branchId) {
      throw new ForbiddenException(
        'You do not have permission to edit this booking',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Update booking fields
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

      // Update payments if provided
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

      // Update denominations if provided (delete + recreate)
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

  async updateStatus(id: string, status: BookingStatus, userId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException(`Booking with id ${id} not found`);
    }

    if (!Object.values(BookingStatus).includes(status)) {
      throw new BadRequestException(`Invalid booking status: ${status}`);
    }

    const previousStatus = booking.status;
    const newWorkflowStatus = BOOKING_TO_WORKFLOW[status];

    return this.prisma.$transaction(async (tx) => {
      // Update booking status
      const updated = await tx.booking.update({
        where: { id },
        data: { status },
      });

      // Update property workflowStatus
      await tx.property.update({
        where: { id: booking.propertyId },
        data: { workflowStatus: newWorkflowStatus },
      });

      // WorkflowHistory for booking
      await tx.workflowHistory.create({
        data: {
          entityType: 'booking',
          entityId: id,
          fromStatus: previousStatus,
          toStatus: status,
          remarks: `Status updated from ${previousStatus} to ${status}`,
          performedBy: userId,
        },
      });

      // WorkflowHistory for property
      await tx.workflowHistory.create({
        data: {
          entityType: 'property',
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

  async remove(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { billing: { select: { id: true } } },
    });
    if (!booking) {
      throw new NotFoundException(`Booking with id ${id} not found`);
    }
    if (booking.billing.length > 0) {
      throw new ConflictException(
        'Cannot delete a booking that has billing records',
      );
    }

    await this.prisma.$transaction([
      this.prisma.document.deleteMany({ where: { entityId: id } }),
      this.prisma.workflowHistory.deleteMany({ where: { entityId: id } }),
      this.prisma.notification.deleteMany({ where: { bookingId: id } }),
      this.prisma.booking.delete({ where: { id } }),
    ]);
  }

  async generatePdf(id: string): Promise<Buffer> {
    if (!this.pdfService) {
      throw new ServiceUnavailableException('PDF service is not available');
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
      throw new NotFoundException(`Booking with id ${id} not found`);
    }

    const pdfData: BookingPdfData = {
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
}
