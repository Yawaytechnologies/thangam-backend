import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { BillingStatus, PaymentMethod, Role } from '@prisma/client';
import { BillingService } from './billing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';

jest.mock('../../common/utils/id-generator.util', () => ({
  generateBillingId: jest.fn().mockReturnValue('STH-BILL-0001'),
}));

jest.mock('../../common/utils/amount-words.util', () => ({
  numberToWords: jest.fn().mockReturnValue('Fifty Thousand Rupees Only'),
}));

const mockTransaction = jest.fn();

const mockPrisma = {
  billing: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  workflowHistory: { create: jest.fn() },
  $transaction: mockTransaction,
};

const mockPdfService = { generatePdf: jest.fn() };

const adminUser = {
  id: 'admin-1',
  role: Role.ADMIN,
  admin: { branchId: 'branch-1' },
};
const superAdminUser = { id: 'super-1', role: Role.SUPER_ADMIN, admin: null };

describe('BillingService', () => {
  let service: BillingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PdfService, useValue: mockPdfService },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    jest.clearAllMocks();
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    beforeEach(() => {
      mockPrisma.billing.findMany.mockResolvedValue([]);
      mockPrisma.billing.count.mockResolvedValue(0);
    });

    it('restricts ADMIN to their branch bookings', async () => {
      await service.findAll(adminUser, {});
      const call = mockPrisma.billing.findMany.mock.calls[0][0];
      expect(JSON.stringify(call.where)).toContain('branch-1');
    });

    it('does not restrict SUPER_ADMIN by default', async () => {
      await service.findAll(superAdminUser, {});
      const call = mockPrisma.billing.findMany.mock.calls[0][0];
      // where should be empty (no AND clauses)
      expect(call.where).toEqual({});
    });

    it('applies status filter', async () => {
      await service.findAll(superAdminUser, { status: BillingStatus.PAID });
      const call = mockPrisma.billing.findMany.mock.calls[0][0];
      expect(JSON.stringify(call.where)).toContain(BillingStatus.PAID);
    });

    it('returns paginated shape', async () => {
      mockPrisma.billing.findMany.mockResolvedValue([{ id: 'b1' }]);
      mockPrisma.billing.count.mockResolvedValue(1);

      const result = await service.findAll(superAdminUser, {
        page: 1,
        limit: 20,
      });
      expect(result).toMatchObject({ total: 1, page: 1, limit: 20 });
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      bookingId: 'booking-1',
      buyerName: 'Rajesh Kumar',
      buyerPhone: '9876543210',
      paymentMethod: PaymentMethod.CASH,
      amountInNumbers: 50000,
      amountInWords: 'Fifty Thousand',
      billingDate: '2024-01-15',
      totalReceived: 50000,
    };

    it('throws NotFoundException when booking does not exist', async () => {
      mockTransaction.mockImplementation(async (fn: any) =>
        fn({
          booking: { findUnique: jest.fn().mockResolvedValue(null) },
          billing: {
            count: jest.fn(),
            create: jest.fn(),
            findUnique: jest.fn(),
          },
          workflowHistory: { create: jest.fn() },
        }),
      );

      await expect(service.create(dto as any, superAdminUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when ADMIN tries to bill a booking from another branch', async () => {
      mockTransaction.mockImplementation(async (fn: any) =>
        fn({
          booking: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'booking-1',
              branchId: 'other-branch', // different from admin's branch-1
              branch: { id: 'other-branch', name: 'Other' },
            }),
          },
          billing: {
            count: jest.fn(),
            create: jest.fn(),
            findUnique: jest.fn(),
          },
          workflowHistory: { create: jest.fn() },
        }),
      );

      await expect(service.create(dto as any, adminUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('creates billing with PENDING status by default', async () => {
      const txCreate = jest.fn().mockResolvedValue({ id: 'billing-1' });
      const txFindUnique = jest
        .fn()
        .mockResolvedValue({ id: 'billing-1', booking: {} });

      mockTransaction.mockImplementation(async (fn: any) =>
        fn({
          booking: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'booking-1',
              branchId: 'branch-1',
              branch: {},
            }),
          },
          billing: {
            count: jest.fn().mockResolvedValue(0),
            create: txCreate,
            findUnique: txFindUnique,
          },
          workflowHistory: { create: jest.fn() },
        }),
      );

      await service.create(dto, adminUser);

      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: BillingStatus.PENDING }),
        }),
      );
    });

    it('auto-generates amountInWords from amountInNumbers', async () => {
      const txCreate = jest.fn().mockResolvedValue({ id: 'billing-1' });
      const txFindUnique = jest
        .fn()
        .mockResolvedValue({ id: 'billing-1', booking: {} });

      mockTransaction.mockImplementation(async (fn: any) =>
        fn({
          booking: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'booking-1',
              branchId: 'branch-1',
              branch: {},
            }),
          },
          billing: {
            count: jest.fn().mockResolvedValue(0),
            create: txCreate,
            findUnique: txFindUnique,
          },
          workflowHistory: { create: jest.fn() },
        }),
      );

      await service.create(dto, adminUser);

      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amountInWords: 'Fifty Thousand Rupees Only',
          }),
        }),
      );
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('throws NotFoundException when billing not found', async () => {
      mockPrisma.billing.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns billing when found', async () => {
      const billing = { id: 'b1', billingId: 'STH-BILL-0001', booking: {} };
      mockPrisma.billing.findUnique.mockResolvedValue(billing);
      const result = await service.findOne('b1');
      expect(result).toBe(billing);
    });
  });
});
