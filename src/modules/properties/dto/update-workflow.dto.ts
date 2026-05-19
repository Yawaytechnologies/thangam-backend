import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { WorkflowStatus } from '@prisma/client';

export class UpdateWorkflowDto {
  @ApiProperty({ enum: WorkflowStatus, description: 'New workflow status' })
  @IsEnum(WorkflowStatus)
  @IsNotEmpty()
  workflowStatus: WorkflowStatus;

  @ApiPropertyOptional({
    description: 'Optional remarks for the status change',
  })
  @IsString()
  @IsOptional()
  remarks?: string;
}
