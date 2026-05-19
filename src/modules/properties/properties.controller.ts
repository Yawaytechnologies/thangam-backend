import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ImageFilePipe } from '../../common/pipes/image-file.pipe';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { PropertyFilterDto } from './dto/property-filter.dto';

@ApiTags('Properties')
@ApiBearerAuth()
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get all properties with optional filters and pagination' })
  findAll(@Query() filters: PropertyFilterDto) {
    return this.propertiesService.findAll(filters);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new property (SUPER_ADMIN only)' })
  create(
    @Body() dto: CreatePropertyDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.propertiesService.create(dto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get a single property by ID with full details' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/workflow')
  @ApiOperation({ summary: 'Get workflow history for a property' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  getWorkflow(@Param('id') id: string) {
    return this.propertiesService.getWorkflow(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/documents')
  @ApiOperation({ summary: 'Get documents for a property' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  getDocuments(@Param('id') id: string) {
    return this.propertiesService.getDocuments(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Put(':id')
  @ApiOperation({ summary: 'Update property details (SUPER_ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.propertiesService.update(id, dto, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Patch(':id/workflow')
  @ApiOperation({ summary: 'Update property workflow status (SUPER_ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  updateWorkflow(
    @Param('id') id: string,
    @Body() dto: UpdateWorkflowDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.propertiesService.updateWorkflow(id, dto, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post(':id/images')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a property image (JPEG/PNG/WebP, max 5 MB)' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  uploadImage(
    @Param('id') id: string,
    @UploadedFile(ImageFilePipe) file: Express.Multer.File,
    @CurrentUser('id') uploadedBy: string,
  ) {
    return this.propertiesService.uploadImage(id, file, uploadedBy);
  }
}
