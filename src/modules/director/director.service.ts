import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentType, Prisma, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DirectorTeamFilterDto } from './dto/director-team-filter.dto';

const memberListSelect = {
  id: true,
  memberId: true,
  fullName: true,
  phone: true,
  email: true,
  role: true,
  status: true,
  reportsToId: true,
  createdAt: true,
  branch: { select: { id: true, branchCode: true, name: true } },
  reportsTo: {
    select: { id: true, memberId: true, fullName: true, role: true },
  },
  documents: {
    where: { documentType: DocumentType.PROFILE_PHOTO },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { storagePath: true },
  },
} satisfies Prisma.MemberSelect;

type SafeMember = Prisma.MemberGetPayload<{ select: typeof memberListSelect }>;
type MemberSummary = Pick<SafeMember, 'id' | 'role' | 'status' | 'createdAt'>;

@Injectable()
export class DirectorService {
  constructor(private readonly prisma: PrismaService) {}

  private async getDirector(userId: string) {
    const director = await this.prisma.member.findFirst({
      where: { userId, role: Role.DIRECTOR },
      select: {
        ...memberListSelect,
        user: { select: { lastLoginAt: true } },
      },
    });

    if (!director) {
      throw new ForbiddenException('Director profile is not available');
    }

    return director;
  }

  /** Follows reportsToId edges only. Branch and role are never used as a shortcut. */
  private async getDescendantIds(rootMemberId: string): Promise<string[]> {
    const visited = new Set<string>([rootMemberId]);
    const descendants: string[] = [];
    let parentIds = [rootMemberId];

    while (parentIds.length > 0) {
      const children = await this.prisma.member.findMany({
        where: { reportsToId: { in: parentIds } },
        select: { id: true },
      });

      const nextIds: string[] = [];
      for (const child of children) {
        if (visited.has(child.id)) continue;
        visited.add(child.id);
        descendants.push(child.id);
        nextIds.push(child.id);
      }
      parentIds = nextIds;
    }

    return descendants;
  }

  private async getDownlineCount(memberId: string) {
    return (await this.getDescendantIds(memberId)).length;
  }

  private presentMember(member: SafeMember, downlineCount: number) {
    const { documents, ...safe } = member;
    return {
      ...safe,
      profilePhoto: documents[0]?.storagePath ?? null,
      downlineCount,
    };
  }

  async getDashboard(userId: string) {
    const director = await this.getDirector(userId);
    const descendantIds = await this.getDescendantIds(director.id);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [members, directReports, recentMembers] = await Promise.all([
      descendantIds.length
        ? this.prisma.member.findMany({
            where: { id: { in: descendantIds } },
            select: { id: true, role: true, status: true, createdAt: true },
          })
        : Promise.resolve<MemberSummary[]>([]),
      this.prisma.member.findMany({
        where: {
          reportsToId: director.id,
          role: Role.EXECUTIVE_DIRECTOR,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: memberListSelect,
      }),
      descendantIds.length
        ? this.prisma.member.findMany({
            where: { id: { in: descendantIds } },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 10,
            select: memberListSelect,
          })
        : Promise.resolve<SafeMember[]>([]),
    ]);

    const roleCounts = {
      executiveDirectors: 0,
      deputyDirectors: 0,
      seniorManagers: 0,
      businessManagers: 0,
      agents: 0,
    };

    for (const member of members) {
      if (member.role === Role.EXECUTIVE_DIRECTOR)
        roleCounts.executiveDirectors++;
      if (member.role === Role.DEPUTY_DIRECTOR) roleCounts.deputyDirectors++;
      if (member.role === Role.SENIOR_MANAGER) roleCounts.seniorManagers++;
      if (member.role === Role.BUSINESS_MANAGER) roleCounts.businessManagers++;
      if (member.role === Role.AGENT) roleCounts.agents++;
    }

    const directReportsWithCounts = await Promise.all(
      directReports.map(async (member) =>
        this.presentMember(member, await this.getDownlineCount(member.id)),
      ),
    );

    const { user: directorUser, ...directorMember } = director;
    const profile = this.presentMember(directorMember, descendantIds.length);
    const recentMembersWithCounts = await Promise.all(
      recentMembers.map(async (member) =>
        this.presentMember(member, await this.getDownlineCount(member.id)),
      ),
    );

    return {
      profile: { ...profile, lastLoginAt: directorUser.lastLoginAt },
      summary: {
        totalMembers: members.length,
        activeMembers: members.filter((m) => m.status === UserStatus.ACTIVE)
          .length,
        pendingMembers: members.filter((m) => m.status === UserStatus.PENDING)
          .length,
        inactiveMembers: members.filter((m) => m.status === UserStatus.INACTIVE)
          .length,
        joinedThisMonth: members.filter((m) => m.createdAt >= monthStart)
          .length,
      },
      roleCounts,
      directReports: directReportsWithCounts,
      recentMembers: recentMembersWithCounts,
    };
  }

  async getTeam(userId: string, filters: DirectorTeamFilterDto) {
    const director = await this.getDirector(userId);
    const descendantIds = await this.getDescendantIds(director.id);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    if (descendantIds.length === 0) return { data: [], total: 0, page, limit };

    const search = filters.search?.trim();
    const where: Prisma.MemberWhereInput = {
      id: { in: descendantIds },
      ...(filters.role && { role: filters.role }),
      ...(filters.status && { status: filters.status }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { memberId: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [members, total] = await this.prisma.$transaction([
      this.prisma.member.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: memberListSelect,
      }),
      this.prisma.member.count({ where }),
    ]);

    const data = await Promise.all(
      members.map(async (member) =>
        this.presentMember(member, await this.getDownlineCount(member.id)),
      ),
    );

    return { data, total, page, limit };
  }

  async getTeamMember(userId: string, memberId: string) {
    const director = await this.getDirector(userId);
    const descendantIds = await this.getDescendantIds(director.id);

    if (!descendantIds.includes(memberId)) {
      throw new NotFoundException('Team member not found');
    }

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: memberListSelect,
    });
    if (!member) throw new NotFoundException('Team member not found');

    const memberDownlineIds = await this.getDescendantIds(member.id);
    const downlineRoles = memberDownlineIds.length
      ? await this.prisma.member.groupBy({
          by: ['role'],
          where: { id: { in: memberDownlineIds } },
          _count: { _all: true },
        })
      : [];
    const directReportCount = await this.prisma.member.count({
      where: { reportsToId: member.id },
    });

    return {
      ...this.presentMember(member, memberDownlineIds.length),
      directReportCount,
      roleWiseDownlineCount: Object.fromEntries(
        downlineRoles.map((item) => [item.role, item._count._all]),
      ),
    };
  }

  async getProfile(userId: string) {
    const director = await this.getDirector(userId);
    const { user, ...member } = director;
    return {
      ...this.presentMember(member, await this.getDownlineCount(director.id)),
      lastLoginAt: user.lastLoginAt,
    };
  }
}
