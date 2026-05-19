import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Res,
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
  ApiResponse,
} from '@nestjs/swagger';
import { Role, BillingStatus } from '@prisma/client';
import type { Response } from 'express';
import { BillingService } from './billing.service';
import { CreateBillingDto } from './dto/create-billing.dto';
import { UpdateBillingDto } from './dto/update-billing.dto';
import { BillingFilterDto } from './dto/billing-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get all billing records with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of billing records' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  findAll(
    @CurrentUser() user: any,
    @Query() filters: BillingFilterDto,
  ) {
    return this.billingService.findAll(user, filters);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new billing record (amountInWords auto-generated)' })
  @ApiResponse({ status: 201, description: 'Billing record created' })
  @ApiResponse({ status: 400, description: 'Booking not found' })
  @ApiResponse({ status: 403, description: 'Admin cannot bill a booking from another branch' })
  create(
    @Body() dto: CreateBillingDto,
    @CurrentUser() user: any,
  ) {
    return this.billingService.create(dto, user);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get a billing record by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Billing detail with booking info' })
  @ApiResponse({ status: 404, description: 'Billing not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.billingService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update a billing record' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBillingDto,
    @CurrentUser() user: any,
  ) {
    return this.billingService.update(id, dto, user);
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update billing status' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Billing status updated' })
  @ApiResponse({ status: 404, description: 'Billing not found' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: Object.values(BillingStatus) },
      },
      required: ['status'],
    },
  })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: BillingStatus,
    @CurrentUser('id') userId: string,
  ) {
    return this.billingService.updateStatus(id, status, userId);
  }

  @Get(':id/pdf')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Download billing receipt PDF' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'PDF file stream', content: { 'application/pdf': {} } })
  @ApiResponse({ status: 404, description: 'Billing not found' })
  async getBillingPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.billingService.generatePdf(id, 'billing');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="billing-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id/estimate')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Download estimate copy PDF' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Estimate PDF file stream', content: { 'application/pdf': {} } })
  @ApiResponse({ status: 404, description: 'Billing not found' })
  async getEstimatePdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.billingService.generatePdf(id, 'estimate');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="estimate-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
