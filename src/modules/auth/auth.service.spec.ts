import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('bcryptjs');

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock-token'),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    const cfg: Record<string, string> = {
      'jwt.secret': 'test-secret',
      'jwt.expiresIn': '15m',
      'jwt.refreshSecret': 'test-refresh-secret',
      'jwt.refreshExpiresIn': '7d',
    };
    return cfg[key];
  }),
};

describe('AuthService', () => {
  let service: AuthService;
  const bcryptCompare = bcrypt.compare as jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockJwt.sign.mockReturnValue('mock-token');
  });

  const activeUser = {
    id: 'user-1',
    email: 'admin@srithangam.com',
    phone: null,
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    passwordHash: '$2b$10$hashed',
    lastLoginAt: null,
    admin: null,
    member: null,
  };

  // ─── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('throws BadRequestException when neither email nor phone is provided', async () => {
      await expect(service.login({ password: 'pass' } as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.login({ email: 'ghost@x.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when account is inactive', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...activeUser,
        status: 'INACTIVE',
      });
      await expect(
        service.login({ email: activeUser.email, password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException on wrong password', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(activeUser);
      bcryptCompare.mockResolvedValue(false);
      await expect(
        service.login({ email: activeUser.email, password: 'wrong-pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns user, accessToken, and refreshToken on success', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(activeUser);
      bcryptCompare.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(activeUser);
      mockPrisma.session.create.mockResolvedValue({});

      const result = await service.login({
        email: activeUser.email,
        password: 'Admin@123',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken', 'mock-token');
      expect(result).toHaveProperty('refreshToken', 'mock-token');
    });

    it('strips passwordHash from returned user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(activeUser);
      bcryptCompare.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(activeUser);
      mockPrisma.session.create.mockResolvedValue({});

      const result = await service.login({
        email: activeUser.email,
        password: 'Admin@123',
      });

      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('accepts phone login', async () => {
      const phoneUser = { ...activeUser, email: null, phone: '9876543210' };
      mockPrisma.user.findFirst.mockResolvedValue(phoneUser);
      bcryptCompare.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(phoneUser);
      mockPrisma.session.create.mockResolvedValue({});

      const result = await service.login({
        phone: '9876543210',
        password: 'pass',
      });

      expect(result.user.phone).toBe('9876543210');
    });

    it('creates a session record on successful login', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(activeUser);
      bcryptCompare.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(activeUser);
      mockPrisma.session.create.mockResolvedValue({});

      await service.login({ email: activeUser.email, password: 'pass' });

      expect(mockPrisma.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });
  });

  // ─── refreshToken ──────────────────────────────────────────────────────────

  describe('refreshToken', () => {
    it('throws UnauthorizedException when session not found', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);
      await expect(service.refreshToken('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when session is expired', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 's1',
        refreshToken: 'tok',
        expiresAt: new Date(Date.now() - 1000), // 1 second in the past
        user: {
          id: 'u1',
          role: 'ADMIN',
          email: 'a@b.com',
          phone: null,
          status: 'ACTIVE',
        },
      });
      await expect(service.refreshToken('tok')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when user is inactive', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 's1',
        refreshToken: 'tok',
        expiresAt: new Date(Date.now() + 60000),
        user: {
          id: 'u1',
          role: 'ADMIN',
          email: 'a@b.com',
          phone: null,
          status: 'INACTIVE',
        },
      });
      await expect(service.refreshToken('tok')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns new accessToken and refreshToken on valid token', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 's1',
        refreshToken: 'valid-refresh',
        expiresAt: new Date(Date.now() + 60000),
        user: {
          id: 'u1',
          role: 'ADMIN',
          email: 'a@b.com',
          phone: null,
          status: 'ACTIVE',
        },
      });
      mockPrisma.session.delete.mockResolvedValue({});
      mockPrisma.session.create.mockResolvedValue({});

      const result = await service.refreshToken('valid-refresh');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('rotates the session (deletes old, creates new)', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 's1',
        refreshToken: 'valid-refresh',
        expiresAt: new Date(Date.now() + 60000),
        user: {
          id: 'u1',
          role: 'ADMIN',
          email: 'a@b.com',
          phone: null,
          status: 'ACTIVE',
        },
      });
      mockPrisma.session.delete.mockResolvedValue({});
      mockPrisma.session.create.mockResolvedValue({});

      await service.refreshToken('valid-refresh');

      expect(mockPrisma.session.delete).toHaveBeenCalledWith({
        where: { id: 's1' },
      });
      expect(mockPrisma.session.create).toHaveBeenCalled();
    });
  });

  // ─── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('deletes the session matching the refresh token', async () => {
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 1 });
      await service.logout('some-refresh-token');
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { refreshToken: 'some-refresh-token' },
      });
    });

    it('does not throw when session not found (idempotent)', async () => {
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.logout('unknown-token')).resolves.not.toThrow();
    });
  });

  // ─── getMe ─────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('throws UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getMe('missing-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns user without passwordHash', async () => {
      const userInDb = { ...activeUser };
      mockPrisma.user.findUnique.mockResolvedValue(userInDb);

      const result = await service.getMe('user-1');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe(activeUser.email);
    });

    it('queries with admin.branch and member includes', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);

      await service.getMe('user-1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: {
          admin: { include: { branch: true } },
          member: true,
        },
      });
    });
  });
});
