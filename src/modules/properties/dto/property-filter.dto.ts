import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PropertyType, WorkflowStatus } from '@prisma/client';

export class PropertyFilterDto {
  @ApiPropertyOptional({ description: 'Search by name, code, plot number or project name' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: PropertyType, description: 'Filter by property type' })
  @IsEnum(PropertyType)
  @IsOptional()
  propertyType?: PropertyType;

  @ApiPropertyOptional({ enum: WorkflowStatus, description: 'Filter by workflow status' })
  @IsEnum(WorkflowStatus)
  @IsOptional()
  workflowStatus?: WorkflowStatus;

  @ApiPropertyOptional({ default: 1, description: 'Page number (1-based)' })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Number of records per page' })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
