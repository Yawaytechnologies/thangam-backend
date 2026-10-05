import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsDivisibleBy,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { PropertyType } from '@prisma/client';

export class CreatePropertyDto {
  @ApiProperty({ description: 'Branch UUID that owns this property' })
  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ description: 'Name of the property' })
  @IsString()
  @IsNotEmpty()
  propertyName: string;

  @ApiPropertyOptional({ description: 'Unique property code' })
  @IsString()
  @IsOptional()
  propertyCode?: string;

  @ApiProperty({ description: 'Name of the project' })
  @IsString()
  @IsNotEmpty()
  projectName: string;

  @ApiProperty({ description: 'Plot number' })
  @IsString()
  @IsNotEmpty()
  plotNumber: string;

  @ApiProperty({ enum: PropertyType, description: 'Type of property' })
  @IsEnum(PropertyType)
  @IsNotEmpty()
  propertyType: PropertyType;

  @ApiProperty({
    description: 'Area in square feet',
    minimum: 100,
    example: 1200,
  })
  @IsNumber()
  @Min(100)
  @IsDivisibleBy(50, { message: 'squareFeet must increase in multiples of 50' })
  @IsNotEmpty()
  squareFeet: number;

  @ApiPropertyOptional({ description: 'Facing direction of the property' })
  @IsString()
  @IsOptional()
  facing?: string;

  @ApiPropertyOptional({ description: 'Street address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'District' })
  @IsString()
  @IsNotEmpty()
  district: string;

  @ApiProperty({ description: 'State' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'Six-digit PIN code', example: '600001' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'pincode must be exactly 6 digits' })
  @IsNotEmpty()
  pincode: string;

  @ApiPropertyOptional({ description: 'Map location URL or coordinates' })
  @IsString()
  @IsOptional()
  mapLocation?: string;
}
