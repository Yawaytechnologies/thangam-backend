import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DocumentType, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MemberFilterDto } from './dto/member-filter.dto';
import { generateMemberId } from '../../common/utils/id-generator.util';

import { getDescendantMemberIds } from '../../common/utils/member-hierarchy.util';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsService: DocumentsService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  private async notifyAdminActivity(payload: {
    title: string;
    message: string;
    type?: 'MEMBER_ACTIVITY' | 'TEAM_ACTIVITY';
    triggeredById?: string;
    branchId?: string | null;
    relatedEntityId?: string;
  }) {
    if (!this.notificationsService) return;

    try {
      await this.notificationsService.createNotification({
        title: payload.title,
        message: payload.message,
        type: payload.type ?? 'MEMBER_ACTIVITY',
        triggeredById: payload.triggeredById,
        branchId: payload.branchId ?? undefined,
        relatedModule: 'Members',
        relatedEntityId: payload.relatedEntityId,
      });
    } catch {
      // Notification failure should not block member operations.
    }
  }

  private async getProfilePhotoUrlMap(
    memberIds: string[],
  ): Promise<Map<string, string | null>> {
    const uniqueMemberIds = [...new Set(memberIds)].filter(Boolean);
    const profilePhotoUrls = new Map<string, string | null>(
      uniqueMemberIds.map((memberId) => [memberId, null]),
    );

    if (uniqueMemberIds.length === 0) return profilePhotoUrls;

    const profilePhotos = await this.prisma.document.findMany({
      where: {
        entityType: 'member',
        entityId: { in: uniqueMemberIds },
        documentType: DocumentType.PROFILE_PHOTO,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        entityId: true,
        storagePath: true,
      },
    });

    const latestProfilePhotos = new Map<string, string>();
    for (const profilePhoto of profilePhotos) {
      if (!latestProfilePhotos.has(profilePhoto.entityId)) {
        latestProfilePhotos.set(
          profilePhoto.entityId,
          profilePhoto.storagePath,
        );
      }
    }

    await Promise.all(
      [...latestProfilePhotos.entries()].map(
        async ([memberId, storagePath]) => {
          try {
            profilePhotoUrls.set(
              memberId,
              await this.documentsService.getSignedUrl(storagePath),
            );
          } catch {
            profilePhotoUrls.set(memberId, null);
          }
        },
      ),
    );

    return profilePhotoUrls;
  }

  private async attachProfilePhotoUrls<T extends { id: string }>(
    members: T[],
  ): Promise<
    Array<T & { photo: string | null; profilePhotoUrl: string | null }>
  > {
    const profilePhotoUrls = await this.getProfilePhotoUrlMap(
      members.map((member) => member.id),
    );

    return members.map((member) => {
      const profilePhotoUrl = profilePhotoUrls.get(member.id) ?? null;
      return {
        ...member,
        photo: profilePhotoUrl,
        profilePhotoUrl,
      };
    });
  }

  private async attachSignedUrlsToImageDocuments<
    T extends { storagePath: string; mimeType: string | null },
  >(documents: T[]): Promise<Array<T & { signedUrl: string | null }>> {
    return Promise.all(
      documents.map(async (document) => {
        if (!document.mimeType?.startsWith('image/')) {
          return { ...document, signedUrl: null };
        }

        try {
          return {
            ...document,
            signedUrl: await this.documentsService.getSignedUrl(
              document.storagePath,
            ),
          };
        } catch {
          return { ...document, signedUrl: null };
        }
      }),
    );
  }

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
        where.id = {
          in: user.member?.id
            ? await getDescendantMemberIds(this.prisma, user.member.id)
            : [],
        };
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
          reportsTo: { select: { id: true, fullName: true, role: true } },
        },
      }),
      this.prisma.member.count({ where }),
    ]);

    return {
      data: await this.attachProfilePhotoUrls(data),
      total,
      page,
      limit,
    };
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

    const passwordHash = await bcrypt.hash(dto.password, 10);

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

    await this.notifyAdminActivity({
      title: 'Member Created',
      message: `New member "${member.fullName}" (${member.memberId}) was created with role ${member.role}.`,
      triggeredById: user?.id,
      branchId: member.branchId,
      relatedEntityId: member.id,
    });

    return member;
  }

  // ─── findOne ──────────────────────────────────────────────────────────────

  async findOne(id: string, user: any) {
    await this.assertMemberVisible(id, user);
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

    const [profilePhotoUrl, documents] = await Promise.all([
      this.documentsService.getLatestSignedUrl('member', id, 'PROFILE_PHOTO'),
      this.attachSignedUrlsToImageDocuments(member.documents),
    ]);

    return {
      ...member,
      documents,
      images: documents.filter((document) => document.signedUrl),
      photo: profilePhotoUrl,
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

  async update(id: string, dto: UpdateMemberDto, user?: any) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!member) throw new NotFoundException('Member not found');

    if (user?.role === Role.ADMIN && member.branchId !== user.admin?.branchId) {
      throw new BadRequestException(
        'You can only update members in your assigned branch',
      );
    }

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

    const changes: string[] = [];
    if (dto.role && dto.role !== member.role) {
      changes.push(`role changed from ${member.role} to ${dto.role}`);
    }
    if (dto.status && dto.status !== member.status) {
      changes.push(`status changed from ${member.status} to ${dto.status}`);
    }
    if (changes.length === 0) changes.push('profile details updated');

    await this.notifyAdminActivity({
      title:
        dto.role && dto.role !== member.role
          ? 'Member Role Changed'
          : 'Member Updated',
      message: `Member "${updated.fullName}" (${updated.memberId}) ${changes.join(', ')}.`,
      triggeredById: user?.id,
      branchId: updated.branchId,
      relatedEntityId: updated.id,
    });

    return updated;
  }

  // ─── updateStatus ─────────────────────────────────────────────────────────

  async updateStatus(id: string, status: UserStatus) {
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Member not found');

    const updated = await this.prisma.$transaction(async (tx) => {
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

    await this.notifyAdminActivity({
      title:
        status === UserStatus.INACTIVE
          ? 'Member Deactivated'
          : 'Member Status Updated',
      message: `Member "${updated.fullName}" (${updated.memberId}) status changed from ${member.status} to ${status}.`,
      branchId: updated.branchId,
      relatedEntityId: updated.id,
    });

    return updated;
  }

  // ─── getTeamForMobile ─────────────────────────────────────────────────────

  async getTeamForMobile(user: any, filters: MemberFilterDto) {
    const { search, role, status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const memberRole: Role = user.member?.role;
    if (!memberRole || !user.member?.id || memberRole === Role.AGENT) {
      return { data: [], total: 0, page, limit };
    }

    const ids = await getDescendantMemberIds(this.prisma, user.member.id);
    const where: any = {
      id: { in: ids },
    };

    if (role) where.role = role;
    if (search)
      where.OR = ['fullName', 'memberId', 'phone', 'codeNumber'].map(
        (field) => ({ [field]: { contains: search, mode: 'insensitive' } }),
      );

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

    return {
      data: await this.attachProfilePhotoUrls(data),
      total,
      page,
      limit,
    };
  }

  // ─── getMemberBottomSheet ─────────────────────────────────────────────────

  private async assertMemberVisible(memberId: string, user: any) {
    if (user.role === Role.SUPER_ADMIN) return;
    if (user.role === Role.ADMIN && user.admin?.branchId) {
      const exists = await this.prisma.member.findFirst({
        where: { id: memberId, branchId: user.admin.branchId },
        select: { id: true },
      });
      if (exists) return;
    } else if (user.member?.id) {
      if (memberId === user.member.id) return;
      if (
        user.member.role !== Role.AGENT &&
        (await getDescendantMemberIds(this.prisma, user.member.id)).includes(
          memberId,
        )
      )
        return;
    }
    throw new NotFoundException('Member not found');
  }

  async getMemberBottomSheet(memberId: string, user: any) {
    await this.assertMemberVisible(memberId, user);
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
        email: true,
        codeNumber: true,
        reportsToId: true,
        reportsTo: { select: { id: true, fullName: true, role: true } },
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
      id: member.id,
      email: member.email,
      codeNumber: member.codeNumber,
      reportsToId: member.reportsToId,
      reportsTo: member.reportsTo,
      branch: member.branch,
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
