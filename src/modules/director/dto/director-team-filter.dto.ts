import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';

const DIRECTOR_DOWNLINE_ROLES = [
  Role.EXECUTIVE_DIRECTOR,
  Role.DEPUTY_DIRECTOR,
  Role.SENIOR_MANAGER,
  Role.BUSINESS_MANAGER,
  Role.AGENT,
] as const;

export class DirectorTeamFilterDto {
  @ApiPropertyOptional({
    description: 'Search by member name, Member ID, or phone number',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: DIRECTOR_DOWNLINE_ROLES })
  @IsOptional()
  @IsEnum(DIRECTOR_DOWNLINE_ROLES)
  role?: (typeof DIRECTOR_DOWNLINE_ROLES)[number];

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
