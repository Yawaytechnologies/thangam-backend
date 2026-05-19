import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document and attach it to an entity' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'entityType', 'entityId', 'documentType'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'File to upload' },
        entityType: { type: 'string', description: 'Entity type (e.g. property, member)' },
        entityId: { type: 'string', description: 'UUID of the entity' },
        documentType: {
          type: 'string',
          enum: Object.values(DocumentType),
          description: 'Document category',
        },
      },
    },
  })
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('entityType') entityType: string,
    @Body('entityId') entityId: string,
    @Body('documentType') documentType: DocumentType,
    @CurrentUser('id') uploadedBy: string,
  ) {
    return this.documentsService.upload(
      file,
      entityType,
      entityId,
      documentType,
      uploadedBy,
    );
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Get a 1-hour signed URL for a document' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  async getSignedUrl(@Param('id') id: string) {
    const result = await this.documentsService.getDocumentWithUrl(id);
    return { signedUrl: result.signedUrl };
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get all documents for a given entity' })
  @ApiParam({ name: 'entityType', description: 'Entity type (e.g. property, member)' })
  @ApiParam({ name: 'entityId', description: 'UUID of the entity' })
  getDocumentsForEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.documentsService.getDocumentsForEntity(entityType, entityId);
  }
}
