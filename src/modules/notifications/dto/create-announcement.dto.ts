import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Monthly Director Meeting' })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title!: string;

  @ApiProperty({ example: 'The meeting is scheduled for Monday at 10:00 AM.' })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional({ type: [String], description: 'Director user IDs' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  recipientUserIds?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  sendToAllDirectors?: boolean;

  @ApiPropertyOptional({ description: 'Optional branch scope for Super Admin' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({
    enum: ['NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL',
  })
  @IsOptional()
  @IsIn(['NORMAL', 'HIGH', 'URGENT'])
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
}
