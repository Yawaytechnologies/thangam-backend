import { NotFoundException } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import { DirectorService } from './director.service';

describe('DirectorService hierarchy authorization', () => {
  const director = {
    id: 'director-id',
    memberId: 'MEM001',
    fullName: 'Director One',
    phone: '9000000001',
    email: 'director@example.com',
    role: Role.DIRECTOR,
    status: UserStatus.ACTIVE,
    reportsToId: null,
    createdAt: new Date(),
    branch: { id: 'branch-id', branchCode: 'BR01', name: 'Chennai' },
    reportsTo: null,
    documents: [],
    user: { lastLoginAt: null },
  };

  function createPrismaMock() {
    return {
      member: {
        findFirst: jest.fn().mockResolvedValue(director),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
    };
  }

  it('rejects a member who is not in the Director reportsToId tree', async () => {
    const prisma = createPrismaMock();
    prisma.member.findMany
      .mockResolvedValueOnce([{ id: 'executive-id' }])
      .mockResolvedValueOnce([]);
    const service = new DirectorService(prisma as never);

    await expect(
      service.getTeamMember('director-user-id', 'same-branch-outsider-id'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.member.findMany).toHaveBeenNthCalledWith(1, {
      where: { reportsToId: { in: ['director-id'] } },
      select: { id: true },
    });
    expect(prisma.member.findUnique).not.toHaveBeenCalled();
  });

  it('allows a member reached recursively through reportsToId', async () => {
    const prisma = createPrismaMock();
    const teamMember = {
      id: 'deputy-id',
      memberId: 'MEM003',
      fullName: 'Deputy One',
      phone: '9000000003',
      email: null,
      role: Role.DEPUTY_DIRECTOR,
      status: UserStatus.ACTIVE,
      reportsToId: 'executive-id',
      createdAt: new Date(),
      branch: { id: 'branch-id', branchCode: 'BR01', name: 'Chennai' },
      reportsTo: {
        id: 'executive-id',
        memberId: 'MEM002',
        fullName: 'Executive One',
        role: Role.EXECUTIVE_DIRECTOR,
      },
      documents: [],
    };

    prisma.member.findMany
      .mockResolvedValueOnce([{ id: 'executive-id' }])
      .mockResolvedValueOnce([{ id: 'deputy-id' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prisma.member.findUnique.mockResolvedValue(teamMember);
    prisma.member.groupBy.mockResolvedValue([]);
    prisma.member.count.mockResolvedValue(0);
    const service = new DirectorService(prisma as never);

    const result = await service.getTeamMember('director-user-id', 'deputy-id');

    expect(result.id).toBe('deputy-id');
    expect(result.directReportCount).toBe(0);
    expect(result).not.toHaveProperty('aadhaarNumber');
    expect(result).not.toHaveProperty('panNumber');
    expect(result).not.toHaveProperty('accountNumber');
  });
});
