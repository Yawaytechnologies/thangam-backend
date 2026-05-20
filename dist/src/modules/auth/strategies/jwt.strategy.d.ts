import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
export interface JwtPayload {
    sub: string;
    role: string;
    jti?: string;
    email?: string;
    phone?: string;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private configService;
    private prisma;
    constructor(configService: ConfigService, prisma: PrismaService);
    validate(payload: JwtPayload): Promise<{
        admin: ({
            branch: {
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
        }) | null;
        member: {
            id: string;
            email: string | null;
            phone: string;
            role: import("@prisma/client").$Enums.Role;
            status: import("@prisma/client").$Enums.UserStatus;
            createdAt: Date;
            updatedAt: Date;
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
            memberId: string;
            bloodGroup: string | null;
            qualification: string | null;
            experience: string | null;
            alternatePhone: string | null;
            panNumber: string | null;
            aadhaarNumber: string | null;
            voterIdNumber: string | null;
            drivingLicense: string | null;
            introName: string | null;
            reportsToId: string | null;
            codeNumber: string | null;
            nomineeName: string | null;
            nomineeRelation: string | null;
            nomineePhone: string | null;
            bankName: string | null;
            accountHolder: string | null;
            accountNumber: string | null;
            ifscCode: string | null;
            bankBranch: string | null;
        } | null;
    } & {
        id: string;
        email: string | null;
        phone: string | null;
        passwordHash: string;
        role: import("@prisma/client").$Enums.Role;
        status: import("@prisma/client").$Enums.UserStatus;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
