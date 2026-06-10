import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProperty,
  ApiParam,
} from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role, BranchStatus } from '@prisma/client';

class UpdateBranchStatusDto {
  @ApiProperty({ enum: BranchStatus })
  @IsEnum(BranchStatus)
  @IsNotEmpty()
  status!: BranchStatus;
}
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchFilterDto } from './dto/branch-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ImageFilePipe } from '../../common/pipes/image-file.pipe';

type BranchImageFiles = {
  images?: Express.Multer.File[];
};

@ApiTags('Branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all branches with pagination and filters' })
  findAll(@Query() filters: BranchFilterDto) {
    return this.branchesService.findAll(filters);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 5 }]))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new branch' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'Chennai Central Branch' },
        branchType: { type: 'string', example: 'Main' },
        phone: { type: 'string', example: '9876543210' },
        address: { type: 'string', example: '12, Anna Salai' },
        city: { type: 'string', example: 'Chennai' },
        district: { type: 'string', example: 'Chennai' },
        state: { type: 'string', example: 'Tamil Nadu' },
        pincode: { type: 'string', example: '600001' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description:
            'Optional branch images. JPEG, PNG, or WebP up to 5 MB each',
        },
        adminId: {
          type: 'string',
          format: 'uuid',
          example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        },
      },
    },
  })
  create(
    @Body() dto: CreateBranchDto,
    @UploadedFiles() files: BranchImageFiles,
    @CurrentUser() user: any,
  ) {
    return this.branchesService.create(dto, user, files.images ?? []);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a single branch by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.branchesService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 5 }]))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a branch' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Chennai Central Branch' },
        branchType: { type: 'string', example: 'Main' },
        phone: { type: 'string', example: '9876543210' },
        address: { type: 'string', example: '12, Anna Salai' },
        city: { type: 'string', example: 'Chennai' },
        district: { type: 'string', example: 'Chennai' },
        state: { type: 'string', example: 'Tamil Nadu' },
        pincode: { type: 'string', example: '600001' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description:
            'Optional branch images to append. JPEG, PNG, or WebP up to 5 MB each',
        },
        adminId: {
          type: 'string',
          format: 'uuid',
          example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        },
      },
    },
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
    @UploadedFiles() files: BranchImageFiles,
  ) {
    return this.branchesService.update(id, dto, files.images ?? []);
  }

  @Post(':id/images')
  @Roles(Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a branch image (JPEG/PNG/WebP, max 5 MB)',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({
    description: 'Upload a branch image using multipart/form-data',
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'JPEG, PNG, or WebP image up to 5 MB',
        },
      },
    },
  })
  uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(ImageFilePipe) file: Express.Multer.File,
    @CurrentUser('id') uploadedBy: string,
  ) {
    return this.branchesService.uploadImage(id, file, uploadedBy);
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update branch status (ACTIVE / INACTIVE)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateBranchStatusDto,
  ) {
    return this.branchesService.updateStatus(id, body.status);
  }
}
