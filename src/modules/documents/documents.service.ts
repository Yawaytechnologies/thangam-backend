import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Document, DocumentType } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  private readonly allowedImageMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];
  private readonly maxImageBytes = 5 * 1024 * 1024;
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>('supabase.url');
    const serviceRoleKey = this.configService.get<string>(
      'supabase.serviceRoleKey',
    );
    this.bucket =
      this.configService.get<string>('supabase.bucket') ?? 'sth-files';

    this.supabase = createClient(supabaseUrl!, serviceRoleKey!);
  }

  async upload(
    file: Express.Multer.File,
    entityType: string,
    entityId: string,
    documentType: DocumentType,
    uploadedBy: string,
  ): Promise<Document> {
    const storagePath = `${entityType}/${entityId}/${Date.now()}-${file.originalname}`;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(storagePath, file.buffer, { contentType: file.mimetype });

    if (error) {
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }

    const document = await this.prisma.document.create({
      data: {
        entityType,
        entityId,
        documentType,
        fileName: file.originalname,
        storagePath,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedBy,
      },
    });

    return document;
  }

  async uploadBookingImages(
    bookingId: string,
    files: Express.Multer.File[],
    uploadedBy: string,
  ): Promise<Array<Document & { signedUrl: string }>> {
    await this.ensureBookingExists(bookingId);
    return this.uploadEntityImages(
      files,
      'booking',
      bookingId,
      DocumentType.BOOKING_IMAGE,
      uploadedBy,
    );
  }

  async uploadBillingImages(
    billingId: string,
    files: Express.Multer.File[],
    uploadedBy: string,
  ): Promise<Array<Document & { signedUrl: string }>> {
    await this.ensureBillingExists(billingId);
    return this.uploadEntityImages(
      files,
      'billing',
      billingId,
      DocumentType.BILLING_IMAGE,
      uploadedBy,
    );
  }

  private async uploadEntityImages(
    files: Express.Multer.File[],
    entityType: string,
    entityId: string,
    documentType: DocumentType,
    uploadedBy: string,
  ): Promise<Array<Document & { signedUrl: string }>> {
    this.validateImageFiles(files);

    const documents = await Promise.all(
      files.map((file) =>
        this.upload(file, entityType, entityId, documentType, uploadedBy),
      ),
    );

    return Promise.all(
      documents.map(async (document) => ({
        ...document,
        signedUrl: await this.getSignedUrl(document.storagePath),
      })),
    );
  }

  private validateImageFiles(files: Express.Multer.File[]) {
    if (!files.length) {
      throw new BadRequestException('At least one image file is required');
    }

    for (const file of files) {
      if (!this.allowedImageMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Only JPEG, PNG, and WebP images are allowed',
        );
      }
      if (file.size > this.maxImageBytes) {
        throw new BadRequestException('Each image must be 5 MB or smaller');
      }
    }
  }

  private async ensureBookingExists(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true },
    });
    if (!booking) {
      throw new NotFoundException(`Booking with id ${bookingId} not found`);
    }
  }

  private async ensureBillingExists(billingId: string) {
    const billing = await this.prisma.billing.findUnique({
      where: { id: billingId },
      select: { id: true },
    });
    if (!billing) {
      throw new NotFoundException(`Billing with id ${billingId} not found`);
    }
  }

  async uploadToStorage(
    file: Express.Multer.File,
    entityType: string,
    entityId: string,
  ): Promise<string> {
    const storagePath = `${entityType}/${entityId}/${Date.now()}-${file.originalname}`;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(storagePath, file.buffer, { contentType: file.mimetype });

    if (error) {
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }

    return storagePath;
  }

  async getSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(storagePath, 3600);

    if (error || !data?.signedUrl) {
      throw new BadRequestException(
        `Failed to generate signed URL: ${error?.message ?? 'Unknown error'}`,
      );
    }

    return data.signedUrl;
  }

  async getDocumentsForEntity(
    entityType: string,
    entityId: string,
  ): Promise<Document[]> {
    return this.prisma.document.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLatestSignedUrl(
    entityType: string,
    entityId: string,
    documentType: DocumentType,
  ): Promise<string | null> {
    const doc = await this.prisma.document.findFirst({
      where: { entityType, entityId, documentType },
      orderBy: { createdAt: 'desc' },
    });
    if (!doc) return null;
    try {
      return await this.getSignedUrl(doc.storagePath);
    } catch {
      return null;
    }
  }

  async getDocumentWithUrl(
    documentId: string,
  ): Promise<Document & { signedUrl: string }> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with id ${documentId} not found`);
    }

    const signedUrl = await this.getSignedUrl(document.storagePath);

    return { ...document, signedUrl };
  }
}
