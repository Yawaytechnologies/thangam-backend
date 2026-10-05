import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('authenticated password changes', () => {
  const createService = async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          passwordHash: await bcrypt.hash('current-password', 4),
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      session: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      $transaction: jest.fn((operations) => Promise.all(operations)),
    };
    return {
      prisma,
      service: new AuthService(prisma as never, {} as never, {} as never),
    };
  };
  it('rejects an incorrect current password without changing the account', async () => {
    const { service, prisma } = await createService();
    await expect(
      service.changePassword('user-1', {
        currentPassword: 'incorrect',
        newPassword: 'new-password',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.session.deleteMany).not.toHaveBeenCalled();
  });
  it('updates only the authenticated user and revokes their refresh sessions', async () => {
    const { service, prisma } = await createService();
    await service.changePassword('user-1', {
      currentPassword: 'current-password',
      newPassword: 'new-password',
    });
    const update = prisma.user.update.mock.calls[0][0];
    expect(update.where).toEqual({ id: 'user-1' });
    expect(await bcrypt.compare('new-password', update.data.passwordHash)).toBe(
      true,
    );
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
  });
});
