import { PropertyType } from '@prisma/client';
export declare class CreatePropertyDto {
    propertyName: string;
    propertyCode?: string;
    projectName: string;
    plotNumber: string;
    propertyType: PropertyType;
    squareFeet?: number;
    facing?: string;
    approvalStatus?: string;
    address?: string;
    city?: string;
    district?: string;
    state?: string;
    pincode?: string;
    mapLocation?: string;
}
