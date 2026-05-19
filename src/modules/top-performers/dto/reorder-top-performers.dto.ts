import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

class ReorderItemDto {
  @ApiProperty({ description: 'UUID of the top performer record', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'New rank', minimum: 1 })
  @IsNumber()
  @Min(1)
  rank: number;

  @ApiProperty({ description: 'New display order', minimum: 0 })
  @IsNumber()
  @Min(0)
  displayOrder: number;
}

export class ReorderTopPerformersDto {
  @ApiProperty({
    type: [ReorderItemDto],
    description: 'Array of top performer records to reorder',
  })
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}
