import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Matches,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const PHONE_NUMBER_REGEX = /^[789]\d{9}$/;

export class CreateBranchDto {
  @ApiProperty({ example: 'Chennai Central Branch' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Main Branch' })
  @IsString()
  @IsNotEmpty()
  branchType!: string;

  @ApiProperty({
    example: '9876543210',
    description: '10-digit Indian mobile number starting with 7, 8, or 9',
  })
  @IsString()
  @Matches(PHONE_NUMBER_REGEX, {
    message: 'phone must contain exactly 10 digits and start with 7, 8, or 9',
  })
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: '12, Anna Salai' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ example: 'Chennai' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ example: 'Chennai' })
  @IsString()
  @IsNotEmpty()
  district!: string;

  @ApiProperty({ example: 'Tamil Nadu' })
  @IsString()
  @IsNotEmpty()
  state!: string;

  @ApiProperty({ example: '600001' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'pincode must contain exactly 6 digits' })
  @Length(6, 6)
  pincode!: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'UUID of an existing admin to assign to this branch',
  })
  @IsUUID()
  @IsOptional()
  adminId?: string;
}
