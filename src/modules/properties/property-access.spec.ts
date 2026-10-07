import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  propertyBranch,
  assertPropertyAccess,
  assertPropertyReadAccess,
  PropertyViewer,
} from '../../common/utils/property-access';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';

describe('Property branch access', () => {
  const admin: PropertyViewer = {
    id: 'admin',
    role: Role.ADMIN,
    admin: { branchId: 'branch-a' },
  };
  const superadmin: PropertyViewer = { id: 'super', role: Role.SUPER_ADMIN };
  const prisma = {
    property: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    $transaction: jest.fn(async (queries: unknown[]) => Promise.all(queries)),
  };
  const service = new PropertiesService(prisma as any, {} as any);
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.property.count.mockResolvedValue(0);
    prisma.property.findMany.mockResolvedValue([]);
    prisma.property.findFirst.mockResolvedValue(null);
  });

  it.each(
    Object.values(Role).filter(
      (role) => role !== Role.SUPER_ADMIN && role !== Role.ADMIN,
    ),
  )('scopes %s to the member branch', (role) => {
    expect(
      propertyBranch({ id: 'member', role, member: { branchId: 'branch-a' } }),
    ).toBe('branch-a');
  });
  it('allows admin property browsing without branch scoping', async () => {
    await service.findAll({}, admin);
    for (const query of [prisma.property.count, prisma.property.findMany]) {
      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    }
  });
  it('allows admin property browsing with an explicit branch filter', async () => {
    await service.findAll({ branchId: 'branch-b' }, admin);
    for (const query of [prisma.property.count, prisma.property.findMany]) {
      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({ where: { branchId: 'branch-b' } }),
      );
    }
  });
  it('rejects member accounts without an assigned branch', async () => {
    await expect(
      service.findAll({}, { id: 'missing', role: Role.AGENT }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.property.findMany).not.toHaveBeenCalled();
  });
  it('lets superadmin list all branches or filter a branch', async () => {
    await service.findAll({}, superadmin);
    expect(prisma.property.count).toHaveBeenLastCalledWith({ where: {} });
    await service.findAll({ branchId: 'branch-b' }, superadmin);
    expect(prisma.property.count).toHaveBeenLastCalledWith({
      where: { branchId: 'branch-b' },
    });
  });
  it('allows a property in the assigned branch', async () => {
    prisma.property.findFirst.mockResolvedValue({ id: 'property-a' });
    await expect(
      assertPropertyAccess(prisma as any, 'property-a', admin),
    ).resolves.toBeUndefined();
    expect(prisma.property.findFirst).toHaveBeenCalledWith({
      where: { id: 'property-a', branchId: 'branch-a' },
      select: { id: true },
    });
  });
  it('allows admins to read property details across branches', async () => {
    prisma.property.findFirst.mockResolvedValue({ id: 'property-b' });
    await expect(
      assertPropertyReadAccess(prisma as any, 'property-b', admin),
    ).resolves.toBeUndefined();
    expect(prisma.property.findFirst).toHaveBeenCalledWith({
      where: { id: 'property-b' },
      select: { id: true },
    });
  });
  it.each(['findOne', 'getWorkflow', 'getDocuments'] as const)(
    'allows admin read %s before returning data',
    async (method) => {
      prisma.property.findFirst.mockResolvedValue({ id: 'property-b' });
      const handler = { [method]: jest.fn() };
      const controller = new PropertiesController(
        handler as any,
        prisma as any,
      );
      await controller[method]('property-b', admin);
      expect(handler[method]).toHaveBeenCalledWith('property-b');
    },
  );
});
