import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTopPerformerDto } from './dto/create-top-performer.dto';
import { ReorderTopPerformersDto } from './dto/reorder-top-performers.dto';

const TOP_PERFORMERS_FREEZE_KEY = 'top_performers_frozen';

@Injectable()
export class TopPerformersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── findAll ──────────────────────────────────────────────────────────────

  async findAll() {
    const [performers, freezeSetting] = await Promise.all([
      this.prisma.topPerformer.findMany({
        orderBy: [{ role: 'asc' }, { displayOrder: 'asc' }, { rank: 'asc' }],
        include: {
          member: {
            select: {
              id: true,
              memberId: true,
              fullName: true,
              role: true,
              status: true,
              branch: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: TOP_PERFORMERS_FREEZE_KEY },
      }),
    ]);

    const froze = freezeSetting?.value === 'true';

    // Group by role
    const groupMap = new Map<string, typeof performers>();
    for (const performer of performers) {
      const roleKey = performer.role as string;
      if (!groupMap.has(roleKey)) {
        groupMap.set(roleKey, []);
      }
      groupMap.get(roleKey)!.push(performer);
    }

    const grouped = Array.from(groupMap.entries()).map(([role, items]) => ({
      role,
      items,
    }));

    return { froze, performers: grouped };
  }

  // ─── create ───────────────────────────────────────────────────────────────

  async create(dto: CreateTopPerformerDto) {
    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
    });
    if (!member) throw new NotFoundException('Member not found');

    return this.prisma.topPerformer.create({
      data: {
        memberId: dto.memberId,
        role: dto.role,
        rank: dto.rank,
        displayOrder: dto.displayOrder,
        taggedCount: dto.taggedCount ?? 0,
        propertiesCount: dto.propertiesCount ?? 0,
      },
      include: {
        member: {
          select: {
            id: true,
            memberId: true,
            fullName: true,
            role: true,
            status: true,
            branch: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
  }

  // ─── update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: Partial<CreateTopPerformerDto>) {
    const existing = await this.prisma.topPerformer.findUnique({
      where: { id },
    });
    if (!existing)
      throw new NotFoundException('Top performer record not found');

    if (dto.memberId) {
      const member = await this.prisma.member.findUnique({
        where: { id: dto.memberId },
      });
      if (!member) throw new NotFoundException('Member not found');
    }

    return this.prisma.topPerformer.update({
      where: { id },
      data: {
        ...(dto.memberId !== undefined && { memberId: dto.memberId }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.rank !== undefined && { rank: dto.rank }),
        ...(dto.displayOrder !== undefined && {
          displayOrder: dto.displayOrder,
        }),
        ...(dto.taggedCount !== undefined && { taggedCount: dto.taggedCount }),
        ...(dto.propertiesCount !== undefined && {
          propertiesCount: dto.propertiesCount,
        }),
      },
      include: {
        member: {
          select: {
            id: true,
            memberId: true,
            fullName: true,
            role: true,
            status: true,
            branch: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
  }

  // ─── remove ───────────────────────────────────────────────────────────────

  async remove(id: string) {
    const existing = await this.prisma.topPerformer.findUnique({
      where: { id },
    });
    if (!existing)
      throw new NotFoundException('Top performer record not found');

    await this.prisma.topPerformer.delete({ where: { id } });
    return { message: 'Top performer deleted successfully' };
  }

  // ─── reorder ──────────────────────────────────────────────────────────────

  async reorder(dto: ReorderTopPerformersDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.topPerformer.update({
          where: { id: item.id },
          data: {
            rank: item.rank,
            displayOrder: item.displayOrder,
          },
        }),
      ),
    );

    return { message: 'Top performers reordered successfully' };
  }

  // ─── Freeze state ──────────────────────────────────────────────────────────

  async getFreezeState(): Promise<{ frozen: boolean }> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: TOP_PERFORMERS_FREEZE_KEY },
    });
    return { frozen: setting?.value === 'true' };
  }

  async toggleFreeze(frozen: boolean) {
    const setting = await this.prisma.systemSetting.upsert({
      where: { key: TOP_PERFORMERS_FREEZE_KEY },
      update: { value: frozen.toString() },
      create: { key: TOP_PERFORMERS_FREEZE_KEY, value: frozen.toString() },
    });
    return { frozen: setting.value === 'true' };
  }
}
