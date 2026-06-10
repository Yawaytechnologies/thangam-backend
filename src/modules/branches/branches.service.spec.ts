import { describe, expect, it, jest } from '@jest/globals';
import { Role } from '@prisma/client';
import { BranchesService } from './branches.service';

describe('BranchesService', () => {
  type BranchCreateArgs = {
    data: {
      branchCode: string;
      name: string;
      branchType?: string;
      phone?: string;
      address?: string;
      city?: string;
      district?: string;
      state?: string;
      pincode?: string;
      admins?: {
        connect: { id: string };
      };
    };
  };

  type AdminRecord = { id: string } | null;
  type UserRecord = {
    id: string;
    role: Role;
    admin: { id: string } | null;
  } | null;

  const branch = {
    id: 'branch-1',
    branchCode: 'STH-BR-001',
    name: 'Chennai Central Branch',
    branchType: null,
    phone: null,
    address: null,
    city: null,
    district: null,
    state: null,
    pincode: null,
    images: null,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    admins: [],
    _count: {
      admins: 0,
      members: 0,
    },
  };

  const createService = () => {
    const prisma = {
      branch: {
        findMany: jest.fn<() => Promise<Array<{ branchCode: string }>>>(),
        create: jest.fn<(args: BranchCreateArgs) => Promise<typeof branch>>(),
      },
      admin: {
        findUnique: jest.fn<() => Promise<AdminRecord>>(),
      },
      user: {
        findUnique: jest.fn<() => Promise<UserRecord>>(),
      },
    };
    prisma.branch.findMany.mockResolvedValue([]);
    prisma.branch.create.mockResolvedValue(branch);
    const documentsService = {
      getSignedUrl: jest.fn(),
    };
    const notificationsService = {
      createNotification: jest.fn<(payload: unknown) => Promise<void>>(),
    };
    notificationsService.createNotification.mockResolvedValue(undefined);

    return {
      service: new BranchesService(
        prisma as any,
        documentsService as any,
        notificationsService as any,
      ),
      prisma,
      notificationsService,
    };
  };

  it('creates a branch when adminId is the current super-admin user id', async () => {
    const { service, prisma, notificationsService } = createService();
    prisma.admin.findUnique.mockResolvedValue(null);

    await service.create(
      { name: 'Chennai Central Branch', adminId: 'super-user-1' },
      { id: 'super-user-1', role: Role.SUPER_ADMIN },
    );

    const createData = prisma.branch.create.mock.calls[0][0].data;
    expect(createData.admins).toBeUndefined();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ triggeredById: 'super-user-1' }),
    );
  });

  it('connects an admin profile when adminId is an admin user id', async () => {
    const { service, prisma } = createService();
    prisma.admin.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin-user-1',
      role: Role.ADMIN,
      admin: {
        id: 'admin-profile-1',
      },
    });

    await service.create(
      { name: 'Chennai Central Branch', adminId: 'admin-user-1' },
      { id: 'super-user-1', role: Role.SUPER_ADMIN },
    );

    const createData = prisma.branch.create.mock.calls[0][0].data;
    expect(createData.admins).toEqual({
      connect: { id: 'admin-profile-1' },
    });
  });

  it('generates the next branch code from the highest existing code', async () => {
    const { service, prisma } = createService();
    prisma.branch.findMany.mockResolvedValue([
      { branchCode: 'STH-BR-001' },
      { branchCode: 'STH-BR-009' },
      { branchCode: 'LEGACY' },
    ]);

    await service.create(
      { name: 'Chennai Central Branch' },
      { id: 'super-user-1', role: Role.SUPER_ADMIN },
    );

    const createData = prisma.branch.create.mock.calls[0][0].data;
    expect(createData.branchCode).toBe('STH-BR-010');
  });
});
