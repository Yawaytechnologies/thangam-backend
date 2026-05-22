import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MemberFilterDto } from './dto/member-filter.dto';
import { generateMemberId } from '../../common/utils/id-generator.util';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsService: DocumentsService,
  ) {}

  // ─── Hierarchy helpers ────────────────────────────────────────────────────

  getDownlineRoles(role: Role): Role[] {
    const hierarchy: Record<string, Role[]> = {
      [Role.DIRECTOR]: [
        Role.EXECUTIVE_DIRECTOR,
        Role.DEPUTY_DIRECTOR,
        Role.SENIOR_MANAGER,
        Role.BUSINESS_MANAGER,
        Role.AGENT,
      ],
      [Role.EXECUTIVE_DIRECTOR]: [
        Role.DEPUTY_DIRECTOR,
        Role.SENIOR_MANAGER,
        Role.BUSINESS_MANAGER,
        Role.AGENT,
      ],
      [Role.DEPUTY_DIRECTOR]: [
        Role.SENIOR_MANAGER,
        Role.BUSINESS_MANAGER,
        Role.AGENT,
      ],
      [Role.SENIOR_MANAGER]: [Role.BUSINESS_MANAGER, Role.AGENT],
      [Role.BUSINESS_MANAGER]: [Role.AGENT],
      [Role.AGENT]: [],
    };
    return hierarchy[role] ?? [];
  }

  // ─── findAll ──────────────────────────────────────────────────────────────

  async findAll(user: any, filters: MemberFilterDto) {
    const { search, role, status, branchId, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Branch scoping
    if (user.role === Role.SUPER_ADMIN) {
      if (branchId) where.branchId = branchId;
    } else if (user.role === Role.ADMIN) {
      where.branchId = user.admin?.branchId;
    } else {
      // Member hierarchy roles
      const memberRole: Role = user.member?.role;
      if (!memberRole) {
        return { data: [], total: 0, page, limit };
      }

      if (memberRole === Role.AGENT) {
        // Agent sees only themselves
        where.id = user.member?.id;
      } else {
        const downlineRoles = this.getDownlineRoles(memberRole);
        where.role = { in: downlineRoles };
        where.branchId = user.member?.branchId;
      }
    }

    // Additional filters
    if (role && !where.role) {
      where.role = role;
    } else if (role && where.role?.in) {
      // Intersect with hierarchy filter
      where.role = {
        in: (where.role.in as Role[]).filter((r) => r === role),
      };
    }

    if (status) where.status = status;

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { memberId: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { codeNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              role: true,
              status: true,
              lastLoginAt: true,
              createdAt: true,
            },
          },
          branch: true,
        },
      }),
      this.prisma.member.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ─── create ───────────────────────────────────────────────────────────────

  async create(dto: CreateMemberDto, user: any) {
    let branchId: string;

    if (user.role === Role.ADMIN) {
      branchId = user.admin?.branchId;
      if (!branchId) {
        throw new BadRequestException(
          'Admin is not associated with any branch',
        );
      }
    } else if (user.role === Role.SUPER_ADMIN) {
      branchId = dto.branchId ?? '';
      if (!branchId) {
        throw new BadRequestException('branchId is required for SUPER_ADMIN');
      }
    } else {
      throw new BadRequestException(
        'You do not have permission to create members',
      );
    }

    // Validate branch exists
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    // Uniqueness checks
    const existingPhone = await this.prisma.user.findFirst({
      where: { phone: dto.phone },
    });
    if (existingPhone) throw new ConflictException('phone already exists');

    if (dto.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: { email: dto.email },
      });
      if (existingEmail) throw new ConflictException('email already exists');
    }

    if (dto.aadhaarNumber) {
      const existingAadhaar = await this.prisma.member.findFirst({
        where: { aadhaarNumber: dto.aadhaarNumber },
      });
      if (existingAadhaar)
        throw new ConflictException('aadhaarNumber already exists');
    }

    if (dto.panNumber) {
      const existingPan = await this.prisma.member.findFirst({
        where: { panNumber: dto.panNumber },
      });
      if (existingPan) throw new ConflictException('panNumber already exists');
    }

    // Validate reportsToId if provided
    if (dto.reportsToId) {
      const reportsTo = await this.prisma.member.findUnique({
        where: { id: dto.reportsToId },
      });
      if (!reportsTo)
        throw new NotFoundException('reportsToId member not found');
    }

    // Generate member sequence
    const count = await this.prisma.member.count();
    const memberId = generateMemberId(count + 1);

    const defaultPassword = dto.phone;
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const member = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          role: dto.role,
          phone: dto.phone,
          email: dto.email ?? null,
          passwordHash,
          status: UserStatus.ACTIVE,
        },
      });

      const newMember = await tx.member.create({
        data: {
          memberId,
          userId: newUser.id,
          branchId,
          fullName: dto.fullName,
          gender: dto.gender ?? null,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          bloodGroup: dto.bloodGroup ?? null,
          qualification: dto.qualification ?? null,
          experience: dto.experience ?? null,
          phone: dto.phone,
          alternatePhone: dto.alternatePhone ?? null,
          email: dto.email ?? null,
          address: dto.address ?? null,
          city: dto.city ?? null,
          district: dto.district ?? null,
          state: dto.state ?? null,
          pincode: dto.pincode ?? null,
          panNumber: dto.panNumber ?? null,
          aadhaarNumber: dto.aadhaarNumber ?? null,
          voterIdNumber: dto.voterIdNumber ?? null,
          drivingLicense: dto.drivingLicense ?? null,
          role: dto.role,
          introName: dto.introName ?? null,
          reportsToId: dto.reportsToId ?? null,
          codeNumber: dto.codeNumber ?? null,
          nomineeName: dto.nomineeName ?? null,
          nomineeRelation: dto.nomineeRelation ?? null,
          nomineePhone: dto.nomineePhone ?? null,
          bankName: dto.bankName ?? null,
          accountHolder: dto.accountHolder ?? null,
          accountNumber: dto.accountNumber ?? null,
          ifscCode: dto.ifscCode ?? null,
          bankBranch: dto.bankBranch ?? null,
          status: UserStatus.ACTIVE,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              role: true,
              status: true,
              createdAt: true,
            },
          },
          branch: true,
        },
      });

      return newMember;
    });

    return member;
  }

  // ─── findOne ──────────────────────────────────────────────────────────────

  async findOne(id: string, _user: unknown) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        branch: true,
        reportsTo: {
          select: {
            id: true,
            memberId: true,
            fullName: true,
            role: true,
            phone: true,
          },
        },
        documents: {
          select: {
            id: true,
            documentType: true,
            fileName: true,
            storagePath: true,
            mimeType: true,
            fileSize: true,
            isVerified: true,
            uploadedBy: true,
            createdAt: true,
          },
        },
      },
    });

    if (!member) throw new NotFoundException('Member not found');

    // Downline counts per role
    const [directorCount, edCount, ddCount, smCount, bmCount, agentCount] =
      await Promise.all([
        this.prisma.member.count({
          where: { reportsToId: id, role: Role.DIRECTOR },
        }),
        this.prisma.member.count({
          where: { reportsToId: id, role: Role.EXECUTIVE_DIRECTOR },
        }),
        this.prisma.member.count({
          where: { reportsToId: id, role: Role.DEPUTY_DIRECTOR },
        }),
        this.prisma.member.count({
          where: { reportsToId: id, role: Role.SENIOR_MANAGER },
        }),
        this.prisma.member.count({
          where: { reportsToId: id, role: Role.BUSINESS_MANAGER },
        }),
        this.prisma.member.count({
          where: { reportsToId: id, role: Role.AGENT },
        }),
      ]);

    const profilePhotoUrl = await this.documentsService.getLatestSignedUrl(
      'member',
      id,
      'PROFILE_PHOTO',
    );

    return {
      ...member,
      profilePhotoUrl,
      downlineSummary: {
        directorCount,
        edCount,
        ddCount,
        smCount,
        bmCount,
        agentCount,
        total:
          directorCount + edCount + ddCount + smCount + bmCount + agentCount,
      },
    };
  }

  // ─── update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateMemberDto) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!member) throw new NotFoundException('Member not found');

    // Check uniqueness for phone/email/pan/aadhaar if changed
    if (dto.phone && dto.phone !== member.phone) {
      const existing = await this.prisma.user.findFirst({
        where: { phone: dto.phone, NOT: { id: member.userId } },
      });
      if (existing) throw new ConflictException('phone already exists');
    }

    if (dto.email && dto.email !== member.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id: member.userId } },
      });
      if (existing) throw new ConflictException('email already exists');
    }

    if (dto.panNumber && dto.panNumber !== member.panNumber) {
      const existing = await this.prisma.member.findFirst({
        where: { panNumber: dto.panNumber, NOT: { id } },
      });
      if (existing) throw new ConflictException('panNumber already exists');
    }

    if (dto.aadhaarNumber && dto.aadhaarNumber !== member.aadhaarNumber) {
      const existing = await this.prisma.member.findFirst({
        where: { aadhaarNumber: dto.aadhaarNumber, NOT: { id } },
      });
      if (existing) throw new ConflictException('aadhaarNumber already exists');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update user fields if changed
      const userUpdate: any = {};
      if (dto.phone) userUpdate.phone = dto.phone;
      if (dto.email !== undefined) userUpdate.email = dto.email ?? null;
      if (dto.role) userUpdate.role = dto.role;
      if (dto.status) userUpdate.status = dto.status;

      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({
          where: { id: member.userId },
          data: userUpdate,
        });
      }

      return tx.member.update({
        where: { id },
        data: {
          ...(dto.fullName !== undefined && { fullName: dto.fullName }),
          ...(dto.gender !== undefined && { gender: dto.gender }),
          ...(dto.dateOfBirth !== undefined && {
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          }),
          ...(dto.bloodGroup !== undefined && { bloodGroup: dto.bloodGroup }),
          ...(dto.qualification !== undefined && {
            qualification: dto.qualification,
          }),
          ...(dto.experience !== undefined && { experience: dto.experience }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.alternatePhone !== undefined && {
            alternatePhone: dto.alternatePhone,
          }),
          ...(dto.email !== undefined && { email: dto.email ?? null }),
          ...(dto.address !== undefined && { address: dto.address }),
          ...(dto.city !== undefined && { city: dto.city }),
          ...(dto.district !== undefined && { district: dto.district }),
          ...(dto.state !== undefined && { state: dto.state }),
          ...(dto.pincode !== undefined && { pincode: dto.pincode }),
          ...(dto.panNumber !== undefined && { panNumber: dto.panNumber }),
          ...(dto.aadhaarNumber !== undefined && {
            aadhaarNumber: dto.aadhaarNumber,
          }),
          ...(dto.voterIdNumber !== undefined && {
            voterIdNumber: dto.voterIdNumber,
          }),
          ...(dto.drivingLicense !== undefined && {
            drivingLicense: dto.drivingLicense,
          }),
          ...(dto.role !== undefined && { role: dto.role }),
          ...(dto.introName !== undefined && { introName: dto.introName }),
          ...(dto.reportsToId !== undefined && {
            reportsToId: dto.reportsToId ?? null,
          }),
          ...(dto.codeNumber !== undefined && { codeNumber: dto.codeNumber }),
          ...(dto.nomineeName !== undefined && {
            nomineeName: dto.nomineeName,
          }),
          ...(dto.nomineeRelation !== undefined && {
            nomineeRelation: dto.nomineeRelation,
          }),
          ...(dto.nomineePhone !== undefined && {
            nomineePhone: dto.nomineePhone,
          }),
          ...(dto.bankName !== undefined && { bankName: dto.bankName }),
          ...(dto.accountHolder !== undefined && {
            accountHolder: dto.accountHolder,
          }),
          ...(dto.accountNumber !== undefined && {
            accountNumber: dto.accountNumber,
          }),
          ...(dto.ifscCode !== undefined && { ifscCode: dto.ifscCode }),
          ...(dto.bankBranch !== undefined && { bankBranch: dto.bankBranch }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.branchId !== undefined && { branchId: dto.branchId }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              role: true,
              status: true,
            },
          },
          branch: true,
        },
      });
    });

    return updated;
  }

  // ─── updateStatus ─────────────────────────────────────────────────────────

  async updateStatus(id: string, status: UserStatus) {
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Member not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: member.userId },
        data: { status },
      });

      return tx.member.update({
        where: { id },
        data: { status },
        include: {
          user: {
            select: { id: true, status: true },
          },
        },
      });
    });
  }

  // ─── getTeamForMobile ─────────────────────────────────────────────────────

  async getTeamForMobile(user: any, filters: MemberFilterDto) {
    const { role, status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const memberRole: Role = user.member?.role;
    if (!memberRole) {
      return { data: [], total: 0, page, limit };
    }

    if (memberRole === Role.AGENT) {
      const self = await this.prisma.member.findUnique({
        where: { id: user.member.id },
        include: {
          user: {
            select: { id: true, status: true, role: true },
          },
          branch: true,
        },
      });
      return {
        data: self ? [self] : [],
        total: self ? 1 : 0,
        page,
        limit,
      };
    }

    const downlineRoles = this.getDownlineRoles(memberRole);
    const where: any = {
      role: { in: downlineRoles },
      branchId: user.member?.branchId,
    };

    if (role) {
      if (downlineRoles.includes(role)) {
        where.role = role;
      } else {
        return { data: [], total: 0, page, limit };
      }
    }

    if (status) where.status = status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, status: true, role: true },
          },
          branch: { select: { id: true, name: true } },
          reportsTo: {
            select: { id: true, fullName: true, role: true },
          },
        },
      }),
      this.prisma.member.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ─── getMemberBottomSheet ─────────────────────────────────────────────────

  async getMemberBottomSheet(memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        memberId: true,
        fullName: true,
        role: true,
        phone: true,
        status: true,
        createdAt: true,
        branch: {
          select: { id: true, name: true },
        },
        documents: {
          where: { documentType: 'PROFILE_PHOTO' },
          select: { storagePath: true, fileName: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!member) throw new NotFoundException('Member not found');

    const profilePhoto = member.documents[0] ?? null;
    let profilePhotoUrl: string | null = null;
    if (profilePhoto) {
      try {
        profilePhotoUrl = await this.documentsService.getSignedUrl(
          profilePhoto.storagePath,
        );
      } catch {
        profilePhotoUrl = null;
      }
    }

    return {
      profilePhotoUrl,
      fullName: member.fullName,
      role: member.role,
      memberId: member.memberId,
      phone: member.phone,
      branchName: member.branch?.name ?? null,
      createdAt: member.createdAt,
      status: member.status,
    };
  }

  async uploadProfilePhoto(
    memberId: string,
    file: Express.Multer.File,
    uploadedBy: string,
  ) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });
    if (!member) throw new NotFoundException('Member not found');

    const document = await this.documentsService.upload(
      file,
      'member',
      memberId,
      'PROFILE_PHOTO',
      uploadedBy,
    );
    const profilePhotoUrl = await this.documentsService.getSignedUrl(
      document.storagePath,
    );

    return { document, profilePhotoUrl };
  }
}
