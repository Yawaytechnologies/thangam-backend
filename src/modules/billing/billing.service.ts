import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ServiceUnavailableException,
  Optional,
} from '@nestjs/common';
import { BillingStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBillingDto } from './dto/create-billing.dto';
import { UpdateBillingDto } from './dto/update-billing.dto';
import { BillingFilterDto } from './dto/billing-filter.dto';
import { generateBillingId } from '../../common/utils/id-generator.util';
import { numberToWords } from '../../common/utils/amount-words.util';
import { PdfService } from '../pdf/pdf.service';
import { EstimatePdfData } from '../pdf/templates/estimate-copy.template';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly pdfService: PdfService,
  ) {}

  async findAll(user: any, filters: BillingFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const andClauses: any[] = [];

    // Role-based branch restriction: ADMIN sees only billings from their branch's bookings
    if (user.role === Role.ADMIN) {
      andClauses.push({ booking: { branchId: user.admin?.branchId } });
    }

    // SUPER_ADMIN can filter by branchId
    if (filters.branchId && user.role === Role.SUPER_ADMIN) {
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

    if (filters.startDate || filters.endDate) {
      const createdAtFilter: any = {};
      if (filters.startDate) createdAtFilter.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        createdAtFilter.lte = end;
      }
      andClauses.push({ createdAt: createdAtFilter });
    }

    const where: any = andClauses.length > 0 ? { AND: andClauses } : {};

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

  async create(dto: CreateBillingDto, user: any) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Find booking
      const booking = await tx.booking.findUnique({
        where: { id: dto.bookingId },
        include: {
          branch: { select: { id: true, name: true } },
        },
      });

      if (!booking) {
        throw new NotFoundException(
          `Booking with id ${dto.bookingId} not found`,
        );
      }

      // ADMIN branch check
      if (
        user.role === Role.ADMIN &&
        booking.branchId !== user.admin?.branchId
      ) {
        throw new ForbiddenException(
          'You do not have permission to create billing for this booking',
        );
      }

      // 2. Auto-generate billingId
      const count = await tx.billing.count();
      const billingId = generateBillingId(count + 1);

      // 3. Auto-generate amountInWords
      const amountInWords = numberToWords(dto.amountInNumbers);

      // 4. Create Billing record
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
          status: BillingStatus.PENDING,
        },
      });

      // 5. Create WorkflowHistory for billing
      await tx.workflowHistory.create({
        data: {
          entityType: 'billing',
          entityId: billing.id,
          fromStatus: null,
          toStatus: BillingStatus.PENDING,
          remarks: 'Billing record created',
          performedBy: user.id,
        },
      });

      // Return billing with booking
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

  async findOne(id: string) {
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
      throw new NotFoundException(`Billing record with id ${id} not found`);
    }

    return billing;
  }

  async update(id: string, dto: UpdateBillingDto, user: any) {
    const billing = await this.prisma.billing.findUnique({
      where: { id },
      include: {
        booking: { select: { branchId: true } },
      },
    });

    if (!billing) {
      throw new NotFoundException(`Billing record with id ${id} not found`);
    }

    // ADMIN cannot edit completed billings
    if (
      user.role === Role.ADMIN &&
      billing.status === BillingStatus.COMPLETED
    ) {
      throw new ForbiddenException('Cannot edit a completed billing record');
    }

    // ADMIN branch restriction
    if (
      user.role === Role.ADMIN &&
      billing.booking.branchId !== user.admin?.branchId
    ) {
      throw new ForbiddenException(
        'You do not have permission to edit this billing record',
      );
    }

    // Recalculate amountInWords if amountInNumbers changes
    let amountInWords: string | undefined;
    if (dto.amountInNumbers !== undefined) {
      amountInWords = numberToWords(dto.amountInNumbers);
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

  async updateStatus(id: string, status: BillingStatus, userId: string) {
    const billing = await this.prisma.billing.findUnique({ where: { id } });
    if (!billing) {
      throw new NotFoundException(`Billing record with id ${id} not found`);
    }

    if (!Object.values(BillingStatus).includes(status)) {
      throw new BadRequestException(`Invalid billing status: ${status}`);
    }

    const previousStatus = billing.status;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.billing.update({
        where: { id },
        data: { status },
      });

      await tx.workflowHistory.create({
        data: {
          entityType: 'billing',
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

  async remove(id: string) {
    const billing = await this.prisma.billing.findUnique({ where: { id } });
    if (!billing) {
      throw new NotFoundException(`Billing with id ${id} not found`);
    }

    await this.prisma.$transaction([
      this.prisma.document.deleteMany({ where: { entityId: id } }),
      this.prisma.workflowHistory.deleteMany({ where: { entityId: id } }),
      this.prisma.notification.deleteMany({ where: { billingId: id } }),
      this.prisma.billing.delete({ where: { id } }),
    ]);
  }

  async generatePdf(id: string, type: 'billing' | 'estimate'): Promise<Buffer> {
    if (!this.pdfService) {
      throw new ServiceUnavailableException('PDF service is not available');
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
      throw new NotFoundException(`Billing record with id ${id} not found`);
    }

    const pdfData: EstimatePdfData = {
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
}
