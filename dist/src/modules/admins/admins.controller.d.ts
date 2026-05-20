import { UserStatus } from '@prisma/client';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminFilterDto } from './dto/admin-filter.dto';
export declare class AdminsController {
    private readonly adminsService;
    constructor(adminsService: AdminsService);
    findAll(filters: AdminFilterDto): Promise<{
        data: ({
            user: {
                id: string;
                email: string | null;
                phone: string | null;
                role: import("@prisma/client").$Enums.Role;
                status: import("@prisma/client").$Enums.UserStatus;
                lastLoginAt: Date | null;
            };
            branch: {
                id: string;
                status: import("@prisma/client").$Enums.BranchStatus;
                name: string;
                city: string | null;
                state: string | null;
                branchCode: string;
            };
        } & {
            id: string;
            email: string | null;
            phone: string;
            status: import("@prisma/client").$Enums.UserStatus;
            createdAt: Date;
            updatedAt: Date;
            adminId: string;
            userId: string;
            branchId: string;
            fullName: string;
            gender: string | null;
            dateOfBirth: Date | null;
            address: string | null;
            city: string | null;
            district: string | null;
            state: string | null;
            pincode: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    create(dto: CreateAdminDto, userId: string): Promise<{
        user: {
            id: string;
            email: string | null;
            phone: string | null;
            role: import("@prisma/client").$Enums.Role;
            status: import("@prisma/client").$Enums.UserStatus;
        };
        branch: {
            id: string;
            name: string;
            branchCode: string;
        };
    } & {
        id: string;
        email: string | null;
        phone: string;
        status: import("@prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        adminId: string;
        userId: string;
        branchId: string;
        fullName: string;
        gender: string | null;
        dateOfBirth: Date | null;
        address: string | null;
        city: string | null;
        district: string | null;
        state: string | null;
        pincode: string | null;
    }>;
    findOne(id: string): Promise<{
        profilePhotoUrl: string | null;
        activitySummary: {
            membersAdded: number;
            bookingsHandled: number;
            billingUpdates: number;
        };
        user: {
            id: string;
            email: string | null;
            phone: string | null;
            role: import("@prisma/client").$Enums.Role;
            status: import("@prisma/client").$Enums.UserStatus;
            lastLoginAt: Date | null;
            createdAt: Date;
        };
        branch: {
            id: string;
            status: import("@prisma/client").$Enums.BranchStatus;
            name: string;
            city: string | null;
            state: string | null;
            branchCode: string;
        };
        id: string;
        email: string | null;
        phone: string;
        status: import("@prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        adminId: string;
        userId: string;
        branchId: string;
        fullName: string;
        gender: string | null;
        dateOfBirth: Date | null;
        address: string | null;
        city: string | null;
        district: string | null;
        state: string | null;
        pincode: string | null;
    }>;
    update(id: string, dto: UpdateAdminDto): Promise<{
        user: {
            id: string;
            email: string | null;
            phone: string | null;
            role: import("@prisma/client").$Enums.Role;
            status: import("@prisma/client").$Enums.UserStatus;
        };
        branch: {
            id: string;
            name: string;
            branchCode: string;
        };
    } & {
        id: string;
        email: string | null;
        phone: string;
        status: import("@prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        adminId: string;
        userId: string;
        branchId: string;
        fullName: string;
        gender: string | null;
        dateOfBirth: Date | null;
        address: string | null;
        city: string | null;
        district: string | null;
        state: string | null;
        pincode: string | null;
    }>;
    updateStatus(id: string, status: UserStatus): Promise<({
        user: {
            id: string;
            email: string | null;
            phone: string | null;
            role: import("@prisma/client").$Enums.Role;
            status: import("@prisma/client").$Enums.UserStatus;
        };
        branch: {
            id: string;
            name: string;
            branchCode: string;
        };
    } & {
        id: string;
        email: string | null;
        phone: string;
        status: import("@prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        adminId: string;
        userId: string;
        branchId: string;
        fullName: string;
        gender: string | null;
        dateOfBirth: Date | null;
        address: string | null;
        city: string | null;
        district: string | null;
        state: string | null;
        pincode: string | null;
    }) | null>;
    getOwnProfile(userId: string): Promise<{
        profilePhotoUrl: string | null;
        user: {
            id: string;
            email: string | null;
            phone: string | null;
            role: import("@prisma/client").$Enums.Role;
            status: import("@prisma/client").$Enums.UserStatus;
            lastLoginAt: Date | null;
            createdAt: Date;
        };
        branch: {
            id: string;
            email: string | null;
            phone: string | null;
            status: import("@prisma/client").$Enums.BranchStatus;
            name: string;
            city: string | null;
            state: string | null;
            branchCode: string;
        };
        id: string;
        email: string | null;
        phone: string;
        status: import("@prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        adminId: string;
        userId: string;
        branchId: string;
        fullName: string;
        gender: string | null;
        dateOfBirth: Date | null;
        address: string | null;
        city: string | null;
        district: string | null;
        state: string | null;
        pincode: string | null;
    }>;
    uploadPhoto(id: string, file: Express.Multer.File, uploadedBy: string): Promise<{
        document: {
            id: string;
            createdAt: Date;
            entityType: string;
            entityId: string;
            documentType: import("@prisma/client").$Enums.DocumentType;
            fileName: string;
            storagePath: string;
            mimeType: string;
            fileSize: number | null;
            isVerified: boolean;
            uploadedBy: string | null;
        };
        profilePhotoUrl: string;
    }>;
}
