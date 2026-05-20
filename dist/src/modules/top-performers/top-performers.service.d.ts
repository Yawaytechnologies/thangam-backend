import { PrismaService } from '../../prisma/prisma.service';
import { CreateTopPerformerDto } from './dto/create-top-performer.dto';
import { ReorderTopPerformersDto } from './dto/reorder-top-performers.dto';
export declare class TopPerformersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        froze: boolean;
        performers: {
            role: string;
            items: ({
                member: {
                    id: string;
                    role: import("@prisma/client").$Enums.Role;
                    status: import("@prisma/client").$Enums.UserStatus;
                    branch: {
                        id: string;
                        name: string;
                    };
                    fullName: string;
                    memberId: string;
                };
            } & {
                id: string;
                role: import("@prisma/client").$Enums.Role;
                createdAt: Date;
                updatedAt: Date;
                memberId: string;
                rank: number;
                displayOrder: number;
                taggedCount: number;
                propertiesCount: number;
                isActive: boolean;
            })[];
        }[];
    }>;
    create(dto: CreateTopPerformerDto): Promise<{
        member: {
            id: string;
            role: import("@prisma/client").$Enums.Role;
            status: import("@prisma/client").$Enums.UserStatus;
            branch: {
                id: string;
                name: string;
            };
            fullName: string;
            memberId: string;
        };
    } & {
        id: string;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
        updatedAt: Date;
        memberId: string;
        rank: number;
        displayOrder: number;
        taggedCount: number;
        propertiesCount: number;
        isActive: boolean;
    }>;
    update(id: string, dto: Partial<CreateTopPerformerDto>): Promise<{
        member: {
            id: string;
            role: import("@prisma/client").$Enums.Role;
            status: import("@prisma/client").$Enums.UserStatus;
            branch: {
                id: string;
                name: string;
            };
            fullName: string;
            memberId: string;
        };
    } & {
        id: string;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
        updatedAt: Date;
        memberId: string;
        rank: number;
        displayOrder: number;
        taggedCount: number;
        propertiesCount: number;
        isActive: boolean;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
    reorder(dto: ReorderTopPerformersDto): Promise<{
        message: string;
    }>;
    getFreezeState(): Promise<{
        frozen: boolean;
    }>;
    toggleFreeze(frozen: boolean): Promise<{
        frozen: boolean;
    }>;
}
