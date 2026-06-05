import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Billing, Document, DocumentType, WorkflowStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { generatePropertyId } from '../../common/utils/id-generator.util';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { PropertyFilterDto } from './dto/property-filter.dto';

@Injectable()
export class PropertiesService {
  private readonly propertyDocumentTypes: DocumentType[] = [
    DocumentType.LAYOUT_DOCUMENT,
    DocumentType.APPROVAL_DOCUMENT,
    DocumentType.BROCHURE,
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsService: DocumentsService,
  ) {}

  private async attachSignedUrls(documents: Document[]) {
    return Promise.all(
      documents.map(async (doc) => {
        try {
          return {
            ...doc,
            signedUrl: await this.documentsService.getSignedUrl(
              doc.storagePath,
            ),
          };
        } catch {
          return { ...doc, signedUrl: null };
        }
      }),
    );
  }

  async findAll(filters: PropertyFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

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

    // Note: Property has no direct branchId — filter via bookings if needed
    // if (filters.branchId) { where.branchId = filters.branchId; }

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
          documents: true,
        },
      }),
    ]);

    const data = await Promise.all(
      properties.map(async (p) => {
        const documentsWithUrls = await this.attachSignedUrls(p.documents);

        return {
          ...p,
          documents: documentsWithUrls.filter(
            (doc) => doc.documentType !== DocumentType.PROPERTY_IMAGE,
          ),
          images: documentsWithUrls
            .filter((doc) => doc.documentType === DocumentType.PROPERTY_IMAGE)
            .map((doc) => ({
              id: doc.id,
              fileName: doc.fileName,
              url: doc.signedUrl,
            })),
          bookingCount: p._count.bookings,
          latestBookingStatus: p.bookings[0]?.status ?? null,
          latestBooking: p.bookings[0] ?? null,
          _count: undefined,
          bookings: undefined,
        };
      }),
    );

    return { data, total, page, limit };
  }

  async create(dto: CreatePropertyDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.property.count();
      const propertyId = generatePropertyId(count + 1);

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
          address: dto.address,
          city: dto.city,
          district: dto.district,
          state: dto.state,
          pincode: dto.pincode,
          mapLocation: dto.mapLocation,
          workflowStatus: WorkflowStatus.AVAILABLE,
        },
      });

      await tx.workflowHistory.create({
        data: {
          entityType: 'property',
          entityId: property.id,
          fromStatus: null,
          toStatus: WorkflowStatus.AVAILABLE,
          remarks: 'Property created',
          performedBy: userId,
        },
      });

      return property;
    });
  }

  async findOne(id: string) {
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
      throw new NotFoundException(`Property with id ${id} not found`);
    }

    // Attach latest billing from latest booking
    let latestBilling: Billing | null = null;
    if (property.bookings.length > 0) {
      latestBilling = await this.prisma.billing.findFirst({
        where: { bookingId: property.bookings[0].id },
        orderBy: { createdAt: 'desc' },
      });
    }

    const documentsWithUrls = await this.attachSignedUrls(property.documents);

    return {
      ...property,
      documents: documentsWithUrls.filter(
        (doc) => doc.documentType !== DocumentType.PROPERTY_IMAGE,
      ),
      images: documentsWithUrls
        .filter((doc) => doc.documentType === DocumentType.PROPERTY_IMAGE)
        .map((doc) => ({
          id: doc.id,
          fileName: doc.fileName,
          url: doc.signedUrl,
        })),
      latestBooking: property.bookings[0] ?? null,
      latestBilling,
    };
  }

  async uploadImage(
    propertyId: string,
    file: Express.Multer.File,
    uploadedBy: string,
  ) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property)
      throw new NotFoundException(`Property with id ${propertyId} not found`);

    const document = await this.documentsService.upload(
      file,
      'property',
      propertyId,
      DocumentType.PROPERTY_IMAGE,
      uploadedBy,
    );
    const url = await this.documentsService.getSignedUrl(document.storagePath);

    return { document, url };
  }

  async uploadImages(
    propertyId: string,
    files: Express.Multer.File[],
    uploadedBy: string,
  ) {
    if (!files.length)
      throw new BadRequestException('At least one image file is required');

    const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
    const MAX_BYTES = 5 * 1024 * 1024;
    for (const file of files) {
      if (!ALLOWED_MIME.includes(file.mimetype))
        throw new BadRequestException(
          'Only JPEG, PNG, and WebP images are allowed',
        );
      if (file.size > MAX_BYTES)
        throw new BadRequestException('Each image must be 5 MB or smaller');
    }

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property)
      throw new NotFoundException(`Property with id ${propertyId} not found`);

    await Promise.all(
      files.map((file) =>
        this.documentsService.upload(
          file,
          'property',
          propertyId,
          DocumentType.PROPERTY_IMAGE,
          uploadedBy,
        ),
      ),
    );

    return this.findOne(propertyId);
  }

  async uploadDocuments(
    propertyId: string,
    files: Express.Multer.File[],
    documentType: DocumentType,
    uploadedBy: string,
  ) {
    if (!files.length) {
      throw new BadRequestException('At least one document file is required');
    }

    if (!this.propertyDocumentTypes.includes(documentType)) {
      throw new BadRequestException(
        `documentType must be one of: ${this.propertyDocumentTypes.join(', ')}`,
      );
    }

    const MAX_BYTES = 10 * 1024 * 1024;
    for (const file of files) {
      if (file.size > MAX_BYTES) {
        throw new BadRequestException('Each document must be 10 MB or smaller');
      }
    }

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) {
      throw new NotFoundException(`Property with id ${propertyId} not found`);
    }

    await Promise.all(
      files.map((file) =>
        this.documentsService.upload(
          file,
          'property',
          propertyId,
          documentType,
          uploadedBy,
        ),
      ),
    );

    return this.findOne(propertyId);
  }

  async getWorkflow(id: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) {
      throw new NotFoundException(`Property with id ${id} not found`);
    }

    return this.prisma.workflowHistory.findMany({
      where: {
        entityType: 'property',
        entityId: id,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getDocuments(id: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) {
      throw new NotFoundException(`Property with id ${id} not found`);
    }

    const documents = await this.prisma.document.findMany({
      where: {
        entityType: 'property',
        entityId: id,
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.attachSignedUrls(documents);
  }

  async update(id: string, dto: UpdatePropertyDto, _userId: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) {
      throw new NotFoundException(`Property with id ${id} not found`);
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
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.district !== undefined && { district: dto.district }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.pincode !== undefined && { pincode: dto.pincode }),
        ...(dto.mapLocation !== undefined && { mapLocation: dto.mapLocation }),
      },
    });
  }

  async updateWorkflow(id: string, dto: UpdateWorkflowDto, userId: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) {
      throw new NotFoundException(`Property with id ${id} not found`);
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
}
