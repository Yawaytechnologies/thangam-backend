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
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ImageFilePipe } from '../../common/pipes/image-file.pipe';
import { Role, UserStatus } from '@prisma/client';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminFilterDto } from './dto/admin-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Admins')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get('admins')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all admins with pagination and filters (SUPER_ADMIN only)' })
  findAll(@Query() filters: AdminFilterDto) {
    return this.adminsService.findAll(filters);
  }

  @Post('admins')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new admin (SUPER_ADMIN only)' })
  create(
    @Body() dto: CreateAdminDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.adminsService.create(dto, userId);
  }

  @Get('admins/:id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a single admin by ID (SUPER_ADMIN only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminsService.findOne(id);
  }

  @Put('admins/:id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update an admin (SUPER_ADMIN only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminDto,
  ) {
    return this.adminsService.update(id, dto);
  }

  @Patch('admins/:id/status')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update admin status (SUPER_ADMIN only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: UserStatus,
  ) {
    return this.adminsService.updateStatus(id, status);
  }

  @Get('admin/profile')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get own admin profile (ADMIN only)' })
  getOwnProfile(@CurrentUser('id') userId: string) {
    return this.adminsService.getOwnProfile(userId);
  }

  @Post('admins/:id/photo')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload profile photo for an admin (JPEG/PNG/WebP, max 5 MB)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(ImageFilePipe) file: Express.Multer.File,
    @CurrentUser('id') uploadedBy: string,
  ) {
    return this.adminsService.uploadProfilePhoto(id, file, uploadedBy);
  }
}
