import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BranchStatus } from '@prisma/client';

export class BranchFilterDto {
  @ApiPropertyOptional({ description: 'Search by name, code, city or state' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: BranchStatus })
  @IsEnum(BranchStatus)
  @IsOptional()
  status?: BranchStatus;

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
