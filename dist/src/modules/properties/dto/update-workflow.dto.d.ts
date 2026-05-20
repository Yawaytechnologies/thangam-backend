import { WorkflowStatus } from '@prisma/client';
export declare class UpdateWorkflowDto {
    workflowStatus: WorkflowStatus;
    remarks?: string;
}
