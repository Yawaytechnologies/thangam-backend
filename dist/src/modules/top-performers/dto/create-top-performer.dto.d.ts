import { Role } from '@prisma/client';
export declare class CreateTopPerformerDto {
    memberId: string;
    role: Role;
    rank: number;
    displayOrder: number;
    taggedCount: number;
    propertiesCount: number;
}
