import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class PaymentDto {
  @ApiPropertyOptional({ example: 'State Bank of India' })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional({ example: 'Sri Thangam Housing' })
  @IsString()
  @IsOptional()
  favourOf?: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsString()
  @IsOptional()
  chequeNumber?: string;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsString()
  @IsOptional()
  chequeDate?: string;

  @ApiPropertyOptional({ example: 'TXN123456789' })
  @IsString()
  @IsOptional()
  gpayReference?: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsNumber()
  @IsOptional()
  cashAmount?: number;

  @ApiProperty({ example: 100000 })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}

export class DenominationDto {
  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(1)
  denomination: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(1)
  count: number;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateBookingDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({ example: 'Rajesh Kumar' })
  @IsString()
  @IsNotEmpty()
  applicantName: string;

  @ApiPropertyOptional({ example: 'S/o' })
  @IsString()
  @IsOptional()
  relation?: string;

  @ApiPropertyOptional({ example: '12, Anna Salai, Chennai' })
  @IsString()
  @IsOptional()
  applicantAddress?: string;

  @ApiPropertyOptional({ example: '600001' })
  @IsString()
  @IsOptional()
  pinCode?: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  cellNumber: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: '2010-06-20' })
  @IsString()
  @IsOptional()
  weddingDay?: string;

  @ApiProperty({ example: 'Green Valley Township' })
  @IsString()
  @IsNotEmpty()
  projectName: string;

  @ApiProperty({ example: 'PLOT-101' })
  @IsString()
  @IsNotEmpty()
  plotNumber: string;

  @ApiPropertyOptional({ example: 1200 })
  @IsNumber()
  @IsOptional()
  squareFeet?: number;

  @ApiProperty({ example: '2024-01-15' })
  @IsString()
  @IsNotEmpty()
  bookingDate: string;

  @ApiPropertyOptional({ example: 'Suresh (Executive Director)' })
  @IsString()
  @IsOptional()
  edDdSmBmName?: string;

  @ApiPropertyOptional({ example: 'REF-001' })
  @IsString()
  @IsOptional()
  referenceCode?: string;

  @ApiPropertyOptional({ example: 'Mr. Arun Kumar' })
  @IsString()
  @IsOptional()
  directorName?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/signatures/sig_001.png' })
  @IsString()
  @IsOptional()
  signatureUrl?: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Required for SUPER_ADMIN — branch to associate the booking with',
  })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ type: [PaymentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  @IsOptional()
  payments?: PaymentDto[];

  @ApiPropertyOptional({ type: [DenominationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DenominationDto)
  @IsOptional()
  denominations?: DenominationDto[];
}
