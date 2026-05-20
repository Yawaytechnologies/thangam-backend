import { DocumentType } from '@prisma/client';
import { DocumentsService } from './documents.service';
export declare class DocumentsController {
    private readonly documentsService;
    constructor(documentsService: DocumentsService);
    upload(file: Express.Multer.File, entityType: string, entityId: string, documentType: DocumentType, uploadedBy: string): Promise<{
        id: string;
        createdAt: Date;
        entityType: string;
        entityId: string;
        documentType: import("@prisma/client").$Enums.DocumentType;
        fileName: string;
        storagePath: string;
        mimeType: string;
        fileSize: number | null;
        isVerified: boolean;
        uploadedBy: string | null;
    }>;
    getSignedUrl(id: string): Promise<{
        signedUrl: string;
    }>;
    getDocumentsForEntity(entityType: string, entityId: string): Promise<{
        id: string;
        createdAt: Date;
        entityType: string;
        entityId: string;
        documentType: import("@prisma/client").$Enums.DocumentType;
        fileName: string;
        storagePath: string;
        mimeType: string;
        fileSize: number | null;
        isVerified: boolean;
        uploadedBy: string | null;
    }[]>;
}
