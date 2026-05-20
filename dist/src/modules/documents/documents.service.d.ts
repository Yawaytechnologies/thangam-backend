import { ConfigService } from '@nestjs/config';
import { Document, DocumentType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export declare class DocumentsService {
    private readonly prisma;
    private readonly configService;
    private readonly supabase;
    private readonly bucket;
    constructor(prisma: PrismaService, configService: ConfigService);
    upload(file: Express.Multer.File, entityType: string, entityId: string, documentType: DocumentType, uploadedBy: string): Promise<Document>;
    getSignedUrl(storagePath: string): Promise<string>;
    getDocumentsForEntity(entityType: string, entityId: string): Promise<Document[]>;
    getLatestSignedUrl(entityType: string, entityId: string, documentType: DocumentType): Promise<string | null>;
    getDocumentWithUrl(documentId: string): Promise<Document & {
        signedUrl: string;
    }>;
}
