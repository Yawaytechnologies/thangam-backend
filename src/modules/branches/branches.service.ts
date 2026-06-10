import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { BranchStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DocumentsService } from '../documents/documents.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchFilterDto } from './dto/branch-filter.dto';
import { generateBranchCode } from '../../common/utils/id-generator.util';

const getBranchImages = (images: unknown): string[] => {
  if (!Array.isArray(images)) return [];
  return images.filter((image): image is string => typeof image === 'string');
};

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type AuthenticatedUser = {
  id: string;
  role: Role;
};

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsService: DocumentsService,
    @Optional() private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(filters: BranchFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { branchCode: { contains: filters.search, mode: 'insensitive' } },
        { city: { contains: filters.search, mode: 'insensitive' } },
        { state: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              admins: true,
              members: true,
            },
          },
        },
      }),
      this.prisma.branch.count({ where }),
    ]);

    const branches = await Promise.all(
      data.map((branch) => this.withSignedBranchImages(branch)),
    );

    return { data: branches, total, page, limit };
  }

  async create(
    dto: CreateBranchDto,
    user: AuthenticatedUser,
    files: Express.Multer.File[] = [],
  ) {
    const { adminId, ...branchData } = dto;
    const assignableAdminId = await this.resolveAssignableAdminId(
      adminId,
      user,
    );

    let branch: Awaited<ReturnType<typeof this.createBranchRecord>> | undefined;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        branch = await this.createBranchRecord(branchData, assignableAdminId);
        break;
      } catch (error) {
        if (!this.isBranchCodeConflict(error) || attempt === 3) {
          throw error;
        }
      }
    }
    if (!branch) {
      throw new Error('Failed to create branch');
    }

    if (files.length > 0) {
      const storagePaths = await this.uploadBranchImages(branch.id, files);
      const existingImages = (branch as { images?: unknown }).images;
      const images = [...getBranchImages(existingImages), ...storagePaths];
      branch = await this.prisma.branch.update({
        where: { id: branch.id },
        data: { images },
        include: {
          admins: true,
          _count: {
            select: {
              admins: true,
              members: true,
            },
          },
        },
      });
    }

    if (this.notificationsService) {
      try {
        await this.notificationsService.createNotification({
          title: 'Branch Created',
          message: `New branch "${branch.name}" (${branch.branchCode}) has been created.`,
          type: 'BRANCH_ACTIVITY',
          triggeredById: user.id,
          branchId: branch.id,
        });
      } catch {
        // Notification failure should not block branch creation
      }
    }

    return this.withSignedBranchImages(branch);
  }

  private async createBranchRecord(
    branchData: Omit<CreateBranchDto, 'adminId'>,
    assignableAdminId: string | undefined,
  ) {
    const branchCode = await this.generateNextBranchCode();

    return this.prisma.branch.create({
      data: {
        branchCode,
        name: branchData.name,
        branchType: branchData.branchType,
        phone: branchData.phone,
        address: branchData.address,
        city: branchData.city,
        district: branchData.district,
        state: branchData.state,
        pincode: branchData.pincode,
        ...(assignableAdminId && {
          admins: {
            connect: { id: assignableAdminId },
          },
        }),
      },
      include: {
        admins: true,
        _count: {
          select: {
            admins: true,
            members: true,
          },
        },
      },
    });
  }

  private async generateNextBranchCode(): Promise<string> {
    const branches = await this.prisma.branch.findMany({
      select: { branchCode: true },
    });

    const maxSequence = branches.reduce((max, branch) => {
      const match = /^STH-BR-(\d+)$/.exec(branch.branchCode);
      if (!match) return max;

      const sequence = Number(match[1]);
      return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
    }, 0);

    return generateBranchCode(maxSequence + 1);
  }

  private isBranchCodeConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes('branch_code')
    );
  }

  private async resolveAssignableAdminId(
    adminId: string | undefined,
    user: AuthenticatedUser,
  ) {
    if (!adminId) return undefined;

    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });
    if (admin) return admin.id;

    if (user.role === Role.SUPER_ADMIN && adminId === user.id) {
      return undefined;
    }

    const userForAdminId = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        role: true,
        admin: {
          select: {
            id: true,
          },
        },
      },
    });

    if (userForAdminId?.admin) {
      return userForAdminId.admin.id;
    }

    if (userForAdminId?.role === Role.SUPER_ADMIN) {
      throw new BadRequestException(
        'adminId must be an existing branch admin id. Super admin user ids are not branch admins.',
      );
    }

    throw new NotFoundException(`Admin with id ${adminId} not found`);
  }

  private async uploadBranchImages(
    branchId: string,
    files: Express.Multer.File[],
  ) {
    files.forEach((file) => this.validateImageFile(file));

    return Promise.all(
      files.map((file) =>
        this.documentsService.uploadToStorage(file, 'branch', branchId),
      ),
    );
  }

  private validateImageFile(file: Express.Multer.File) {
    if (!ALLOWED_IMAGE_MIME.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG, and WebP images are allowed',
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Image must be 5 MB or smaller');
    }
  }

  private async withSignedBranchImages<T>(
    branch: T,
  ): Promise<T & { images: string[] }> {
    const imagePaths = getBranchImages((branch as { images?: unknown }).images);
    const images = await Promise.all(
      imagePaths.map(async (storagePath) => {
        try {
          return await this.documentsService.getSignedUrl(storagePath);
        } catch {
          return storagePath;
        }
      }),
    );

    return { ...(branch as object), images } as T & { images: string[] };
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        admins: {
          include: {
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
        },
        _count: {
          select: {
            admins: true,
            members: true,
            bookings: true,
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with id ${id} not found`);
    }

    // Billing count via bookings that belong to this branch
    const billingCount = await this.prisma.billing.count({
      where: {
        booking: {
          branchId: id,
        },
      },
    });

    return this.withSignedBranchImages({
      ...branch,
      operationalSummary: {
        adminCount: branch._count.admins,
        memberCount: branch._count.members,
        bookingCount: branch._count.bookings,
        billingCount,
      },
    });
  }

  async update(
    id: string,
    dto: UpdateBranchDto,
    files: Express.Multer.File[] = [],
  ) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException(`Branch with id ${id} not found`);
    }

    const { adminId, ...branchData } = dto;

    let updated = await this.prisma.branch.update({
      where: { id },
      data: {
        ...(branchData.name !== undefined && { name: branchData.name }),
        ...(branchData.branchType !== undefined && {
          branchType: branchData.branchType,
        }),
        ...(branchData.phone !== undefined && { phone: branchData.phone }),
        ...(branchData.address !== undefined && {
          address: branchData.address,
        }),
        ...(branchData.city !== undefined && { city: branchData.city }),
        ...(branchData.district !== undefined && {
          district: branchData.district,
        }),
        ...(branchData.state !== undefined && { state: branchData.state }),
        ...(branchData.pincode !== undefined && {
          pincode: branchData.pincode,
        }),
        ...(adminId && {
          admins: {
            connect: { id: adminId },
          },
        }),
      },
      include: {
        _count: {
          select: {
            admins: true,
            members: true,
          },
        },
      },
    });

    if (files.length > 0) {
      const storagePaths = await this.uploadBranchImages(id, files);
      const existingImages = (branch as { images?: unknown }).images;
      const images = [...getBranchImages(existingImages), ...storagePaths];
      updated = await this.prisma.branch.update({
        where: { id },
        data: { images },
        include: {
          _count: {
            select: {
              admins: true,
              members: true,
            },
          },
        },
      });
    }

    return this.withSignedBranchImages(updated);
  }

  async updateStatus(id: string, status: BranchStatus) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException(`Branch with id ${id} not found`);
    }

    if (!Object.values(BranchStatus).includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    const updated = await this.prisma.branch.update({
      where: { id },
      data: { status },
    });

    return this.withSignedBranchImages(updated);
  }

  async uploadImage(
    branchId: string,
    file: Express.Multer.File,
    _uploadedBy: string,
  ) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with id ${branchId} not found`);
    }

    const storagePath = await this.documentsService.uploadToStorage(
      file,
      'branch',
      branchId,
    );
    const existingImages = (branch as { images?: unknown }).images;
    const images = [...getBranchImages(existingImages), storagePath];

    const updatedBranch = await this.prisma.branch.update({
      where: { id: branchId },
      data: { images },
    });
    const url = await this.documentsService.getSignedUrl(storagePath);

    const branchWithUrls = await this.withSignedBranchImages(updatedBranch);

    return {
      branch: branchWithUrls,
      storagePath,
      url,
      images: branchWithUrls.images,
    };
  }
}
