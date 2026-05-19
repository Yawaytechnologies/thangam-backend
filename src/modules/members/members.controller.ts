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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { ImageFilePipe } from '../../common/pipes/image-file.pipe';
import { Role, UserStatus } from '@prisma/client';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MemberFilterDto } from './dto/member-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class UpdateStatusDto {
  @ApiProperty({ enum: UserStatus })
  @IsEnum(UserStatus)
  status: UserStatus;
}

@ApiTags('Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @ApiOperation({ summary: 'List members (scoped by role)' })
  @ApiOkResponse({ description: 'Paginated list of members' })
  findAll(@CurrentUser() user: any, @Query() filters: MemberFilterDto) {
    return this.membersService.findAll(user, filters);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new member' })
  @ApiCreatedResponse({ description: 'Member created with default password' })
  create(@Body() dto: CreateMemberDto, @CurrentUser() user: any) {
    return this.membersService.create(dto, user);
  }

  @Get('team')
  @ApiOperation({ summary: 'Get downline team for mobile (hierarchy-scoped)' })
  getTeamForMobile(
    @CurrentUser() user: any,
    @Query() filters: MemberFilterDto,
  ) {
    return this.membersService.getTeamForMobile(user, filters);
  }

  @Get('team/:id')
  @ApiOperation({ summary: 'Get member bottom sheet for mobile' })
  getMemberBottomSheet(@Param('id', ParseUUIDPipe) id: string) {
    return this.membersService.getMemberBottomSheet(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single member by ID with downline summary' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.membersService.findOne(id, user);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update member (SUPER_ADMIN only)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMemberDto) {
    return this.membersService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update member status (SUPER_ADMIN only)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateStatusDto,
  ) {
    return this.membersService.updateStatus(id, body.status);
  }

  @Post(':id/photo')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload profile photo for a member (JPEG/PNG/WebP, max 5 MB)',
  })
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
    return this.membersService.uploadProfilePhoto(id, file, uploadedBy);
  }
}
