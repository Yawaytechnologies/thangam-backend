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
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>('supabase.url');
    const serviceRoleKey = this.configService.get<string>('supabase.serviceRoleKey');
    this.bucket = this.configService.get<string>('supabase.bucket') ?? 'sth-files';

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
