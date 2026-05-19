import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreateBillingDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  @IsNotEmpty()
  bookingId: string;

  @ApiProperty({ example: 'Rajesh Kumar' })
  @IsString()
  @IsNotEmpty()
  buyerName: string;

  @ApiPropertyOptional({ example: '12, Anna Salai, Chennai - 600001' })
  @IsString()
  @IsOptional()
  buyerAddress?: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  buyerPhone: string;

  @ApiPropertyOptional({ example: 'ORD-2024-001' })
  @IsString()
  @IsOptional()
  orderNumber?: string;

  @ApiPropertyOptional({ example: 'BILL-2024-001' })
  @IsString()
  @IsOptional()
  billingNumber?: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsString()
  @IsNotEmpty()
  billingDate: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({
    example: 250000,
    description: 'Amount in numbers; amountInWords is auto-calculated',
  })
  @IsNumber()
  @Min(0)
  amountInNumbers: number;

  @ApiProperty({ example: 250000, description: 'Total amount received so far' })
  @IsNumber()
  @Min(0)
  totalReceived: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Total balance remaining; defaults to 0 if not provided',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalBalance?: number;

  @ApiPropertyOptional({
    example: 'Site visit completed, documents submitted.',
  })
  @IsString()
  @IsOptional()
  operationalNotes?: string;

  @ApiPropertyOptional({ example: 'Final settlement due by 31st March 2024.' })
  @IsString()
  @IsOptional()
  settlementNotes?: string;

  @ApiPropertyOptional({ example: 'Payment is non-refundable.' })
  @IsString()
  @IsOptional()
  termsConditions?: string;

  @ApiPropertyOptional({
    example: 'https://storage.example.com/signatures/sig_001.png',
  })
  @IsString()
  @IsOptional()
  signatureUrl?: string;
}
