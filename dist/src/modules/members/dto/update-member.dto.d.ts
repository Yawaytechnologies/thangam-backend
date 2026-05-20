import { UserStatus } from '@prisma/client';
import { CreateMemberDto } from './create-member.dto';
declare const UpdateMemberDto_base: import("@nestjs/common").Type<Partial<CreateMemberDto>>;
export declare class UpdateMemberDto extends UpdateMemberDto_base {
    status?: UserStatus;
}
export {};
