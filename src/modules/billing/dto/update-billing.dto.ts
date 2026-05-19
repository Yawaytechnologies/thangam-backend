import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, BillingStatus } from '@prisma/client';

export class UpdateBillingDto {
  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 300000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amountInNumbers?: number;

  @ApiPropertyOptional({ example: 300000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalReceived?: number;

  @ApiPropertyOptional({
    example: 'Site visit completed, additional documents pending.',
  })
  @IsString()
  @IsOptional()
  operationalNotes?: string;

  @ApiPropertyOptional({ example: 'Remaining balance to be settled by Q2.' })
  @IsString()
  @IsOptional()
  settlementNotes?: string;

  @ApiPropertyOptional({ example: 'Payment is non-refundable after 7 days.' })
  @IsString()
  @IsOptional()
  termsConditions?: string;

  @ApiPropertyOptional({ enum: BillingStatus })
  @IsEnum(BillingStatus)
  @IsOptional()
  status?: BillingStatus;
}
