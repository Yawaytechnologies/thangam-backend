import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PropertyType } from '@prisma/client';

export class CreatePropertyDto {
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

  @ApiPropertyOptional({ description: 'Area in square feet' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  squareFeet?: number;

  @ApiPropertyOptional({ description: 'Facing direction of the property' })
  @IsString()
  @IsOptional()
  facing?: string;

  @ApiPropertyOptional({ description: 'Street address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'District' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ description: 'State' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ description: 'PIN code' })
  @IsString()
  @IsOptional()
  pincode?: string;

  @ApiPropertyOptional({ description: 'Map location URL or coordinates' })
  @IsString()
  @IsOptional()
  mapLocation?: string;
}
