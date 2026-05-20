import { PropertyType, WorkflowStatus } from '@prisma/client';
export declare class PropertyFilterDto {
    search?: string;
    propertyType?: PropertyType;
    workflowStatus?: WorkflowStatus;
    page?: number;
    limit?: number;
}
