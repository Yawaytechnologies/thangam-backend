import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BillingStatus, PaymentMethod } from '@prisma/client';

export class BillingFilterDto {
  @ApiPropertyOptional({ description: 'Search by billingId, bookingId, buyerName, projectName, plotNumber' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: BillingStatus })
  @IsEnum(BillingStatus)
  @IsOptional()
  status?: BillingStatus;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Filter by branch UUID (SUPER_ADMIN only)' })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ default: 1 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
