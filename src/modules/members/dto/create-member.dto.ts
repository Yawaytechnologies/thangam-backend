import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsUUID,
  IsEmail,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateMemberDto {
  @ApiProperty({ example: 'Ravi Kumar' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/, {
    message: 'fullName should contain only letters and spaces',
  })
  fullName!: string;

  @ApiPropertyOptional({ example: 'Male' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: '1990-06-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'O+' })
  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @ApiPropertyOptional({ example: 'B.Com' })
  @IsOptional()
  @IsString()
  qualification?: string;

  @ApiPropertyOptional({ example: '5 years' })
  @IsOptional()
  @IsString()
  experience?: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'phone must be 10 digits and start with 6, 7, 8, or 9',
  })
  phone!: string;

  @ApiPropertyOptional({ example: '9876543211' })
  @IsOptional()
  @IsString()
  @Matches(/^$|^[6-9]\d{9}$/, {
    message: 'alternatePhone must be 10 digits and start with 6, 7, 8, or 9',
  })
  alternatePhone?: string;

  @ApiPropertyOptional({ example: 'ravi@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '12, Gandhi Street' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Chennai' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Chennai' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: 'Tamil Nadu' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '600001' })
  @IsOptional()
  @IsString()
  @Matches(/^$|^\d{6}$/, {
    message: 'pincode must be a 6-digit number',
  })
  pincode?: string;

  @ApiPropertyOptional({ example: 'ABCDE1234F' })
  @IsOptional()
  @IsString()
  panNumber?: string;

  @ApiPropertyOptional({ example: '123412341234' })
  @IsOptional()
  @IsString()
  aadhaarNumber?: string;

  @ApiPropertyOptional({ example: 'TN/01/234/567890' })
  @IsOptional()
  @IsString()
  voterIdNumber?: string;

  @ApiPropertyOptional({ example: 'TN1234567890' })
  @IsOptional()
  @IsString()
  drivingLicense?: string;

  @ApiProperty({ enum: Role, example: Role.AGENT })
  @IsEnum(Role)
  @IsNotEmpty()
  role!: Role;

  @ApiProperty({ example: 'Member@123', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)\S+$/, {
    message:
      'password must include letters and numbers and cannot contain spaces',
  })
  password!: string;

  @ApiPropertyOptional({ example: 'Suresh Babu' })
  @IsOptional()
  @IsString()
  @Matches(/^$|^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/, {
    message: 'introName should contain only letters and spaces',
  })
  introName?: string;

  @ApiPropertyOptional({ example: 'uuid-of-reporting-member' })
  @IsOptional()
  @IsUUID()
  reportsToId?: string;

  @ApiPropertyOptional({ example: 'CODE-001' })
  @IsOptional()
  @IsString()
  codeNumber?: string;

  @ApiPropertyOptional({ example: 'Priya Kumar' })
  @IsOptional()
  @IsString()
  @Matches(/^$|^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/, {
    message: 'nomineeName should contain only letters and spaces',
  })
  nomineeName?: string;

  @ApiPropertyOptional({ example: 'Spouse' })
  @IsOptional()
  @IsString()
  @Matches(/^$|^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/, {
    message: 'nomineeRelation should contain only letters and spaces',
  })
  nomineeRelation?: string;

  @ApiPropertyOptional({ example: '9876543212' })
  @IsOptional()
  @IsString()
  @Matches(/^$|^[6-9]\d{9}$/, {
    message: 'nomineePhone must be 10 digits and start with 6, 7, 8, or 9',
  })
  nomineePhone?: string;

  @ApiPropertyOptional({ example: 'State Bank of India' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: 'Ravi Kumar' })
  @IsOptional()
  @IsString()
  @Matches(/^$|^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/, {
    message: 'accountHolder should contain only letters and spaces',
  })
  accountHolder?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({ example: 'SBIN0001234' })
  @IsOptional()
  @IsString()
  ifscCode?: string;

  @ApiPropertyOptional({ example: 'Anna Nagar Branch' })
  @IsOptional()
  @IsString()
  bankBranch?: string;

  @ApiPropertyOptional({ description: 'Branch ID (required for SUPER_ADMIN)' })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
