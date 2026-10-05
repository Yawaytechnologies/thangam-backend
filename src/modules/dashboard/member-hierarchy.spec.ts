import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { MembersService } from '../members/members.service';
import { getDescendantMemberIds } from '../../common/utils/member-hierarchy.util';

const roles = [
  Role.DIRECTOR,
  Role.EXECUTIVE_DIRECTOR,
  Role.DEPUTY_DIRECTOR,
  Role.SENIOR_MANAGER,
  Role.BUSINESS_MANAGER,
  Role.AGENT,
];
const chain = roles.map((role, index) => ({
  id: `member-${index}`,
  userId: `user-${index}`,
  role,
  fullName: role,
  reportsToId: index ? `member-${index - 1}` : null,
  branchId: 'branch-a',
  status: 'ACTIVE',
  documents: [],
}));
const records = [
  ...chain,
  {
    ...chain[5],
    id: 'other-team-agent',
    userId: 'other-user',
    reportsToId: 'other-director',
  },
];

function prismaMock() {
  const filter = (where: any) =>
    records.filter(
      (member) =>
        (!where.reportsToId?.in ||
          where.reportsToId.in.includes(member.reportsToId)) &&
        (!where.id?.in || where.id.in.includes(member.id)) &&
        (!where.status || member.status === where.status),
    );
  return {
    member: {
      findUnique: jest.fn(
        async ({ where }) =>
          records.find((member) =>
            where.userId
              ? member.userId === where.userId
              : member.id === where.id,
          ) ?? null,
      ),
      findMany: jest.fn(async ({ where }) => filter(where)),
      count: jest.fn(async ({ where }) => filter(where).length),
    },
    property: { count: jest.fn().mockResolvedValue(2) },
    notificationRecipient: { count: jest.fn().mockResolvedValue(1) },
    document: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
}

describe('mobile role dashboards and downline authorization', () => {
  it.each(roles)(
    '%s sees only their recursively linked downline',
    async (role) => {
      const prisma = prismaMock();
      const index = roles.indexOf(role);
      const result = await new DashboardService(
        prisma as never,
      ).getUserHierarchy(`user-${index}`);
      expect(result.member.id).toBe(`member-${index}`);
      expect(result.members.map((member) => member.id)).toEqual(
        chain.slice(index + 1).map((member) => member.id),
      );
      expect(
        result.members.some((member) => member.id === 'other-team-agent'),
      ).toBe(false);
    },
  );

  it.each(roles)(
    '%s dashboard totals match their downline, with zero for agents',
    async (role) => {
      const index = roles.indexOf(role);
      const service = new DashboardService(prismaMock() as never);
      const result = await service.getUserDashboard(
        `user-${index}`,
        role,
        'branch-a',
      );
      expect(result.totalNetwork).toBe(roles.length - index - 1);
      expect(result.activeMembers).toBe(result.totalNetwork);
    },
  );

  it('rejects missing member profiles instead of falling back to the whole branch', async () => {
    await expect(
      new DashboardService(prismaMock() as never).getUserHierarchy(
        'missing-user',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows descendants in another branch when their reporting link belongs to this user', async () => {
    const prisma = prismaMock();
    prisma.member.findMany
      .mockResolvedValueOnce([{ ...chain[1], branchId: 'branch-b' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...chain[1], branchId: 'branch-b' }]);
    const result = await new DashboardService(prisma as never).getUserHierarchy(
      'user-0',
    );
    expect(result.members.map((member) => member.id)).toEqual(['member-1']);
  });

  it('prevents cycles from repeating members or including the root itself', async () => {
    const prisma = prismaMock();
    prisma.member.findMany
      .mockResolvedValueOnce([chain[1]])
      .mockResolvedValueOnce([chain[0]]);
    expect(await getDescendantMemberIds(prisma as never, 'member-0')).toEqual([
      'member-1',
    ]);
  });

  it('does not allow opening an unrelated same-branch member by ID', async () => {
    const prisma = prismaMock();
    const service = new MembersService(
      prisma as never,
      {} as never,
      {} as never,
    );
    const user = { role: Role.DIRECTOR, member: chain[0] };
    await expect(
      service.getMemberBottomSheet('other-team-agent', user),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.findOne('other-team-agent', user),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.member.findUnique).not.toHaveBeenCalled();
  });

  it('team listing and normal member listing use the same downline IDs', async () => {
    const prisma = prismaMock();
    const service = new MembersService(
      prisma as never,
      {} as never,
      {} as never,
    );
    const user = { role: Role.EXECUTIVE_DIRECTOR, member: chain[1] };
    const team = await service.getTeamForMobile(user, {});
    const listing = await service.findAll(user, {});
    expect(team.data.map((member) => member.id)).toEqual(
      chain.slice(2).map((member) => member.id),
    );
    expect(listing.data.map((member) => member.id)).toEqual(
      team.data.map((member) => member.id),
    );
  });

  it('agents have no team and cannot open a peer profile', async () => {
    const prisma = prismaMock();
    const service = new MembersService(
      prisma as never,
      {} as never,
      {} as never,
    );
    const user = { role: Role.AGENT, member: chain[5] };
    expect((await service.getTeamForMobile(user, {})).total).toBe(0);
    await expect(
      service.getMemberBottomSheet('other-team-agent', user),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.member.findMany).not.toHaveBeenCalled();
  });
});
