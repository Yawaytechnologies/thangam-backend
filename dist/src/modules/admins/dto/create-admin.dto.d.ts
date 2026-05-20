import { UserStatus } from '@prisma/client';
export declare class CreateAdminDto {
    fullName: string;
    gender?: string;
    dateOfBirth?: Date;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    district?: string;
    state?: string;
    pincode?: string;
    branchId: string;
    password: string;
    status?: UserStatus;
}
