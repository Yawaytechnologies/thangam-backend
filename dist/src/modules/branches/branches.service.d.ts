import { BranchStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchFilterDto } from './dto/branch-filter.dto';
export declare class BranchesService {
    private readonly prisma;
    private readonly notificationsService;
    constructor(prisma: PrismaService, notificationsService: NotificationsService);
    findAll(filters: BranchFilterDto): Promise<{
        data: ({
            _count: {
                admins: number;
                members: number;
            };
        } & {
            id: string;
            email: string | null;
            phone: string | null;
            status: import("@prisma/client").$Enums.BranchStatus;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            address: string | null;
            city: string | null;
            district: string | null;
            state: string | null;
            pincode: string | null;
            branchCode: string;
            branchType: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    create(dto: CreateBranchDto, userId: string): Promise<{
        _count: {
            admins: number;
            members: number;
        };
        admins: {
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
        }[];
    } & {
        id: string;
        email: string | null;
        phone: string | null;
        status: import("@prisma/client").$Enums.BranchStatus;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        address: string | null;
        city: string | null;
        district: string | null;
        state: string | null;
        pincode: string | null;
        branchCode: string;
        branchType: string | null;
    }>;
    findOne(id: string): Promise<{
        operationalSummary: {
            adminCount: number;
            memberCount: number;
            bookingCount: number;
            billingCount: number;
        };
        _count: {
            admins: number;
            members: number;
            bookings: number;
        };
        admins: ({
            user: {
                id: string;
                email: string | null;
                phone: string | null;
                role: import("@prisma/client").$Enums.Role;
                status: import("@prisma/client").$Enums.UserStatus;
                lastLoginAt: Date | null;
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
        id: string;
        email: string | null;
        phone: string | null;
        status: import("@prisma/client").$Enums.BranchStatus;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        address: string | null;
        city: string | null;
        district: string | null;
        state: string | null;
        pincode: string | null;
        branchCode: string;
        branchType: string | null;
    }>;
    update(id: string, dto: UpdateBranchDto): Promise<{
        _count: {
            admins: number;
            members: number;
        };
    } & {
        id: string;
        email: string | null;
        phone: string | null;
        status: import("@prisma/client").$Enums.BranchStatus;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        address: string | null;
        city: string | null;
        district: string | null;
        state: string | null;
        pincode: string | null;
        branchCode: string;
        branchType: string | null;
    }>;
    updateStatus(id: string, status: BranchStatus): Promise<{
        id: string;
        email: string | null;
        phone: string | null;
        status: import("@prisma/client").$Enums.BranchStatus;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        address: string | null;
        city: string | null;
        district: string | null;
        state: string | null;
        pincode: string | null;
        branchCode: string;
        branchType: string | null;
    }>;
}
