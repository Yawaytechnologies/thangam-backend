import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsNotEmpty,
  IsInt,
  Min,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateTopPerformerDto {
  @ApiProperty({ description: 'UUID of the member', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  memberId: string;

  @ApiProperty({ enum: Role, description: 'Role of the top performer' })
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;

  @ApiProperty({ description: 'Rank position', minimum: 1 })
  @IsInt()
  @Min(1)
  rank: number;

  @ApiProperty({ description: 'Display order for UI rendering', minimum: 0 })
  @IsInt()
  @Min(0)
  displayOrder: number;

  @ApiProperty({
    description: 'Number of tagged members',
    default: 0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  taggedCount: number = 0;

  @ApiProperty({
    description: 'Number of properties handled',
    default: 0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  propertiesCount: number = 0;
}
