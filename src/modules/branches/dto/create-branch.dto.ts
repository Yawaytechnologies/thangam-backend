import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEmail,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const PHONE_NUMBER_REGEX =
  /^(?:(?:\+91[\s-]?|91[\s-]?|0)?[6-9]\d{9}|(?:\+91[\s-]?|91[\s-]?)?(?:0?\d{2,5}[\s-]?\d{6,8}|\(0?\d{2,5}\)[\s-]?\d{6,8}))$/;

export class CreateBranchDto {
  @ApiProperty({ example: 'Chennai Central Branch' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Main' })
  @IsString()
  @IsOptional()
  branchType?: string;

  @ApiPropertyOptional({
    example: '9876543210',
    description:
      'Indian mobile or telephone number. Examples: 9876543210, +91 9876543210, 044-23456789, 0413 2222222',
  })
  @IsString()
  @Matches(PHONE_NUMBER_REGEX, {
    message: 'phone must be a valid Indian mobile number or telephone number',
  })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'chennai@srithangam.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '12, Anna Salai' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Chennai' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Chennai' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ example: 'Tamil Nadu' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: '600001' })
  @IsString()
  @IsOptional()
  pincode?: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'UUID of an existing admin to assign to this branch',
  })
  @IsUUID()
  @IsOptional()
  adminId?: string;
}
