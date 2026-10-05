import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class CreateReferralDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{16,100}$/) requestKey: string;
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  customerName: string;
  @Transform(trim)
  @Matches(/^[6-9][0-9]{9}$/, {
    message:
      'Customer mobile must be exactly 10 digits, start with 6, 7, 8 or 9, and exclude +91',
  })
  customerPhone: string;
  @IsUUID() propertyId: string;
  @IsOptional() @IsUUID() assignedAgentId?: string;
  @Transform(trim) @IsString() @MaxLength(2000) notes: string;
}
export class ReferralActivityDto {
  @IsIn(['FOLLOW_UP', 'SITE_VISIT', 'SUBMIT']) action:
    | 'FOLLOW_UP'
    | 'SITE_VISIT'
    | 'SUBMIT';
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(2000) notes: string;
  @IsOptional() @IsDateString() nextActionAt?: string;
  @IsInt() @Min(0) version: number;
}
export class ReferralListDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit: number =
    20;
}

export class ReviewReferralDto {
  @IsIn(['FORWARD', 'RETURN', 'APPROVE', 'SEND_TO_ADMIN']) action:
    | 'FORWARD'
    | 'RETURN'
    | 'APPROVE'
    | 'SEND_TO_ADMIN';
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(2000) notes: string;
  @IsInt() @Min(0) version: number;
}
export class CorrectReferralDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  customerName: string;
  @Transform(trim) @Matches(/^[6-9][0-9]{9}$/) customerPhone: string;
  @IsUUID() propertyId: string;
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(2000) notes: string;
  @IsInt() @Min(0) version: number;
}
