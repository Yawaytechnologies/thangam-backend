import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TopPerformersService } from './top-performers.service';
import { CreateTopPerformerDto } from './dto/create-top-performer.dto';
import { ReorderTopPerformersDto } from './dto/reorder-top-performers.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class ToggleFreezeDto {
  @ApiProperty({ description: 'Whether to freeze top performers display' })
  @IsBoolean()
  frozen: boolean;
}

@ApiTags('Top Performers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TopPerformersController {
  constructor(private readonly topPerformersService: TopPerformersService) {}

  // ─── Public-facing (all JWT roles can view) ────────────────────────────

  @Get('super-admin/dashboard/top-performers')
  @ApiOperation({
    summary: 'Get top performers grouped by role with freeze state',
  })
  findAll() {
    return this.topPerformersService.findAll();
  }

  // ─── Settings read (all JWT roles) ─────────────────────────────────────

  @Get('settings/top-performers')
  @ApiOperation({ summary: 'Get top performers freeze state' })
  getFreezeState() {
    return this.topPerformersService.getFreezeState();
  }

  // ─── SUPER_ADMIN write operations ──────────────────────────────────────

  @Post('top-performers')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Create a new top performer entry (SUPER_ADMIN only)',
  })
  create(@Body() dto: CreateTopPerformerDto) {
    return this.topPerformersService.create(dto);
  }

  @Put('top-performers/:id')
  @Roles(Role.SUPER_ADMIN)
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOperation({ summary: 'Update a top performer entry (SUPER_ADMIN only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateTopPerformerDto>,
  ) {
    return this.topPerformersService.update(id, dto);
  }

  @Delete('top-performers/:id')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOperation({ summary: 'Delete a top performer entry (SUPER_ADMIN only)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.topPerformersService.remove(id);
  }

  @Patch('top-performers/reorder')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reorder top performers (SUPER_ADMIN only)' })
  reorder(@Body() dto: ReorderTopPerformersDto) {
    return this.topPerformersService.reorder(dto);
  }

  @Patch('settings/top-performers/freeze')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Toggle freeze state for top performers (SUPER_ADMIN only)',
  })
  @ApiBody({ type: ToggleFreezeDto })
  toggleFreeze(@Body() body: ToggleFreezeDto) {
    return this.topPerformersService.toggleFreeze(body.frozen);
  }
}
