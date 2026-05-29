import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
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
  @ApiOperation({
    summary: 'Get all properties with optional filters and pagination',
  })
  findAll(@Query() filters: PropertyFilterDto) {
    return this.propertiesService.findAll(filters);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new property (SUPER_ADMIN only)' })
  create(@Body() dto: CreatePropertyDto, @CurrentUser('id') userId: string) {
    return this.propertiesService.create(dto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get a single property by ID with full details' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.propertiesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/workflow')
  @ApiOperation({ summary: 'Get workflow history for a property' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  getWorkflow(@Param('id', ParseUUIDPipe) id: string) {
    return this.propertiesService.getWorkflow(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/documents')
  @ApiOperation({ summary: 'Get documents for a property' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  getDocuments(@Param('id', ParseUUIDPipe) id: string) {
    return this.propertiesService.getDocuments(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Put(':id')
  @ApiOperation({ summary: 'Update property details (SUPER_ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePropertyDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.propertiesService.update(id, dto, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Patch(':id/workflow')
  @ApiOperation({
    summary: 'Update property workflow status (SUPER_ADMIN only)',
  })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  updateWorkflow(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkflowDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.propertiesService.updateWorkflow(id, dto, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload up to 10 property images (JPEG/PNG/WebP, max 5 MB each)',
  })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  uploadImages(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser('id') uploadedBy: string,
  ) {
    return this.propertiesService.uploadImages(id, files ?? [], uploadedBy);
  }
}
