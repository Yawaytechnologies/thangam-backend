import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import 'multer';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DocumentsService } from '../documents/documents.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminFilterDto } from './dto/admin-filter.dto';
import { generateAdminId } from '../../common/utils/id-generator.util';

@Injectable()
export class AdminsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsService: DocumentsService,
    @Optional() private readonly notificationsService: NotificationsService,
  ) {}

  private async generateNextAdminId(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const admins = await tx.admin.findMany({
      select: { adminId: true },
    });

    const maxSequence = admins.reduce((max, admin) => {
      const match = /^STH-ADM-(\d+)$/.exec(admin.adminId);
      if (!match) return max;

      const sequence = Number(match[1]);
      return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
    }, 0);

    return generateAdminId(maxSequence + 1);
  }

  private isAdminIdConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes('admin_id')
    );
  }

  async findAll(filters: AdminFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    if (filters.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { adminId: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.admin.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              branchCode: true,
              city: true,
              state: true,
              status: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              role: true,
              status: true,
              lastLoginAt: true,
            },
          },
        },
      }),
      this.prisma.admin.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async create(dto: CreateAdminDto, createdById: string) {
    // Verify branch exists
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with id ${dto.branchId} not found`);
    }

    // Check for duplicate phone/email
    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictException(
          'A user with this phone number already exists',
        );
      }
    }

    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingEmail) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    let result: Awaited<ReturnType<typeof this.createAdminRecord>> | undefined;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        result = await this.createAdminRecord(dto, passwordHash);
        break;
      } catch (error) {
        if (!this.isAdminIdConflict(error) || attempt === 3) {
          throw error;
        }
      }
    }
    if (!result) {
      throw new Error('Failed to create admin');
    }

    if (this.notificationsService) {
      try {
        await this.notificationsService.createNotification({
          title: 'Admin Created',
          message: `New admin "${result.fullName}" (${result.adminId}) has been created for branch "${result.branch.name}".`,
          type: 'ADMIN_ACTIVITY',
          triggeredById: createdById,
          branchId: dto.branchId,
        });
      } catch {
        // Notification failure should not block admin creation
      }
    }

    return result;
  }

  private async createAdminRecord(dto: CreateAdminDto, passwordHash: string) {
    return this.prisma.$transaction(async (tx) => {
      const adminId = await this.generateNextAdminId(tx);

      const user = await tx.user.create({
        data: {
          phone: dto.phone,
          email: dto.email ?? null,
          passwordHash,
          role: Role.ADMIN,
          status: dto.status ?? UserStatus.ACTIVE,
        },
      });

      return tx.admin.create({
        data: {
          adminId,
          userId: user.id,
          branchId: dto.branchId,
          fullName: dto.fullName,
          gender: dto.gender ?? null,
          dateOfBirth: dto.dateOfBirth ?? null,
          phone: dto.phone,
          email: dto.email ?? null,
          address: dto.address ?? null,
          city: dto.city ?? null,
          district: dto.district ?? null,
          state: dto.state ?? null,
          pincode: dto.pincode ?? null,
          status: dto.status ?? UserStatus.ACTIVE,
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              branchCode: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              role: true,
              status: true,
            },
          },
        },
      });
    });
  }

  async findOne(id: string) {
    const admin = await this.prisma.admin.findUnique({
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
        branch: {
          select: {
            id: true,
            name: true,
            branchCode: true,
            city: true,
            state: true,
            status: true,
          },
        },
      },
    });

    if (!admin) {
      throw new NotFoundException(`Admin with id ${id} not found`);
    }

    // Activity summary: members added in same branch, bookings for same branch, billing for same branch
    const [membersAdded, bookingsHandled, billingUpdates] = await Promise.all([
      this.prisma.member.count({
        where: { branchId: admin.branchId },
      }),
      this.prisma.booking.count({
        where: { branchId: admin.branchId },
      }),
      this.prisma.billing.count({
        where: {
          booking: {
            branchId: admin.branchId,
          },
        },
      }),
    ]);

    const profilePhotoUrl = await this.documentsService.getLatestSignedUrl(
      'admin',
      id,
      'PROFILE_PHOTO',
    );

    return {
      ...admin,
      photo: profilePhotoUrl,
      profilePhotoUrl,
      activitySummary: {
        membersAdded,
        bookingsHandled,
        billingUpdates,
      },
    };
  }

  async update(id: string, dto: UpdateAdminDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!admin) {
      throw new NotFoundException(`Admin with id ${id} not found`);
    }

    // Check email uniqueness if being changed
    if (dto.email && dto.email !== admin.user.email) {
      const emailConflict = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id: admin.userId } },
      });
      if (emailConflict) {
        throw new ConflictException(`Email ${dto.email} is already in use`);
      }
    }

    // Check phone uniqueness if being changed
    if (dto.phone && dto.phone !== admin.user.phone) {
      const phoneConflict = await this.prisma.user.findFirst({
        where: { phone: dto.phone, NOT: { id: admin.userId } },
      });
      if (phoneConflict) {
        throw new ConflictException(`Phone ${dto.phone} is already in use`);
      }
    }

    // Verify branch if branchId is being changed
    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
      });
      if (!branch) {
        throw new NotFoundException(`Branch with id ${dto.branchId} not found`);
      }
    }

    const updatedAdmin = await this.prisma.$transaction(async (tx) => {
      // Update user record if email/phone/status changed
      const userUpdates: Record<string, any> = {};
      if (dto.email !== undefined) userUpdates.email = dto.email;
      if (dto.phone !== undefined) userUpdates.phone = dto.phone;
      if (dto.status !== undefined) userUpdates.status = dto.status;

      if (Object.keys(userUpdates).length > 0) {
        await tx.user.update({
          where: { id: admin.userId },
          data: userUpdates,
        });
      }

      return tx.admin.update({
        where: { id },
        data: {
          ...(dto.fullName !== undefined && { fullName: dto.fullName }),
          ...(dto.gender !== undefined && { gender: dto.gender }),
          ...(dto.dateOfBirth !== undefined && {
            dateOfBirth: dto.dateOfBirth,
          }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.address !== undefined && { address: dto.address }),
          ...(dto.city !== undefined && { city: dto.city }),
          ...(dto.district !== undefined && { district: dto.district }),
          ...(dto.state !== undefined && { state: dto.state }),
          ...(dto.pincode !== undefined && { pincode: dto.pincode }),
          ...(dto.branchId !== undefined && { branchId: dto.branchId }),
          ...(dto.status !== undefined && { status: dto.status }),
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              branchCode: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              role: true,
              status: true,
            },
          },
        },
      });
    });

    return updatedAdmin;
  }

  async updateStatus(id: string, status: UserStatus) {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!admin) {
      throw new NotFoundException(`Admin with id ${id} not found`);
    }

    await this.prisma.$transaction([
      this.prisma.admin.update({
        where: { id },
        data: { status },
      }),
      this.prisma.user.update({
        where: { id: admin.userId },
        data: { status },
      }),
    ]);

    return this.prisma.admin.findUnique({
      where: { id },
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
        branch: {
          select: {
            id: true,
            name: true,
            branchCode: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!admin) {
      throw new NotFoundException(`Admin with id ${id} not found`);
    }

    await this.prisma.$transaction([
      this.prisma.document.deleteMany({ where: { entityId: admin.id } }),
      this.prisma.user.delete({ where: { id: admin.userId } }),
    ]);
  }

  async getOwnProfile(userId: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { userId },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            branchCode: true,
            city: true,
            state: true,
            status: true,
            phone: true,
          },
        },
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
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin profile not found');
    }

    const profilePhotoUrl = await this.documentsService.getLatestSignedUrl(
      'admin',
      admin.id,
      'PROFILE_PHOTO',
    );

    return { ...admin, photo: profilePhotoUrl, profilePhotoUrl };
  }

  async uploadProfilePhoto(
    adminId: string,
    file: Express.Multer.File,
    uploadedBy: string,
  ) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });
    if (!admin)
      throw new NotFoundException(`Admin with id ${adminId} not found`);

    const document = await this.documentsService.upload(
      file,
      'admin',
      adminId,
      'PROFILE_PHOTO',
      uploadedBy,
    );
    const profilePhotoUrl = await this.documentsService.getSignedUrl(
      document.storagePath,
    );

    return { document, profilePhotoUrl };
  }

  async resetPassword(adminId: string, newPassword: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, userId: true, fullName: true },
    });
    if (!admin)
      throw new NotFoundException(`Admin with id ${adminId} not found`);

    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException(
        'New password must be at least 6 characters',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: admin.userId },
      data: { passwordHash },
    });

    return { message: `Password reset successfully for ${admin.fullName}` };
  }
}
