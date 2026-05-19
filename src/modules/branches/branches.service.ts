import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { BranchStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchFilterDto } from './dto/branch-filter.dto';
import { generateBranchCode } from '../../common/utils/id-generator.util';

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
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

    return { data, total, page, limit };
  }

  async create(dto: CreateBranchDto, userId: string) {
    const existingCount = await this.prisma.branch.count();
    const branchCode = generateBranchCode(existingCount + 1);

    // If adminId is provided, verify the admin exists
    if (dto.adminId) {
      const admin = await this.prisma.admin.findUnique({
        where: { id: dto.adminId },
      });
      if (!admin) {
        throw new NotFoundException(`Admin with id ${dto.adminId} not found`);
      }
    }

    const { adminId, ...branchData } = dto;

    const branch = await this.prisma.branch.create({
      data: {
        branchCode,
        name: branchData.name,
        branchType: branchData.branchType,
        phone: branchData.phone,
        email: branchData.email,
        address: branchData.address,
        city: branchData.city,
        district: branchData.district,
        state: branchData.state,
        pincode: branchData.pincode,
        ...(adminId && {
          admins: {
            connect: { id: adminId },
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

    if (this.notificationsService) {
      try {
        await this.notificationsService.createNotification({
          title: 'Branch Created',
          message: `New branch "${branch.name}" (${branch.branchCode}) has been created.`,
          type: 'BRANCH_ACTIVITY',
          triggeredById: userId,
          branchId: branch.id,
        });
      } catch {
        // Notification failure should not block branch creation
      }
    }

    return branch;
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

    return {
      ...branch,
      operationalSummary: {
        adminCount: branch._count.admins,
        memberCount: branch._count.members,
        bookingCount: branch._count.bookings,
        billingCount,
      },
    };
  }

  async update(id: string, dto: UpdateBranchDto) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException(`Branch with id ${id} not found`);
    }

    const { adminId, ...branchData } = dto;

    const updated = await this.prisma.branch.update({
      where: { id },
      data: {
        ...(branchData.name !== undefined && { name: branchData.name }),
        ...(branchData.branchType !== undefined && {
          branchType: branchData.branchType,
        }),
        ...(branchData.phone !== undefined && { phone: branchData.phone }),
        ...(branchData.email !== undefined && { email: branchData.email }),
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

    return updated;
  }

  async updateStatus(id: string, status: BranchStatus) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException(`Branch with id ${id} not found`);
    }

    if (!Object.values(BranchStatus).includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    return this.prisma.branch.update({
      where: { id },
      data: { status },
    });
  }
}
