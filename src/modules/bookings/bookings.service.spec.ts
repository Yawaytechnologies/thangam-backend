import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BookingStatus, Role } from '@prisma/client';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';

jest.mock('../../common/utils/id-generator.util', () => ({
  generateBookingId: jest.fn().mockReturnValue('STH-BK-0001'),
}));

const mockTransaction = jest.fn();

const mockPrisma = {
  booking: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  property: { findUnique: jest.fn(), update: jest.fn() },
  workflowHistory: { create: jest.fn() },
  $transaction: mockTransaction,
};

const mockPdfService = { generateBookingPdf: jest.fn(), generatePdf: jest.fn() };

const adminUser = { id: 'admin-1', role: Role.ADMIN, admin: { branchId: 'branch-1' } };
const superAdminUser = { id: 'super-1', role: Role.SUPER_ADMIN, admin: null };

describe('BookingsService', () => {
  let service: BookingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PdfService, useValue: mockPdfService },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    jest.clearAllMocks();
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    beforeEach(() => {
      mockPrisma.booking.findMany.mockResolvedValue([]);
      mockPrisma.booking.count.mockResolvedValue(0);
    });

    it('restricts ADMIN queries to their own branch', async () => {
      await service.findAll(adminUser, {});
      const call = mockPrisma.booking.findMany.mock.calls[0][0];
      expect(call.where).toMatchObject({ branchId: 'branch-1' });
    });

    it('does not restrict SUPER_ADMIN to a branch by default', async () => {
      await service.findAll(superAdminUser, {});
      const call = mockPrisma.booking.findMany.mock.calls[0][0];
      expect(call.where).not.toHaveProperty('branchId');
    });

    it('applies branchId filter for SUPER_ADMIN when provided', async () => {
      await service.findAll(superAdminUser, { branchId: 'branch-x' });
      const call = mockPrisma.booking.findMany.mock.calls[0][0];
      expect(call.where).toMatchObject({ branchId: 'branch-x' });
    });

    it('ignores branchId filter for ADMIN (always uses own branch)', async () => {
      await service.findAll(adminUser, { branchId: 'other-branch' });
      const call = mockPrisma.booking.findMany.mock.calls[0][0];
      expect(call.where).toMatchObject({ branchId: 'branch-1' });
    });

    it('applies status filter', async () => {
      await service.findAll(superAdminUser, { status: BookingStatus.TOKEN_RECEIVED });
      const call = mockPrisma.booking.findMany.mock.calls[0][0];
      expect(call.where).toMatchObject({ status: BookingStatus.TOKEN_RECEIVED });
    });

    it('builds OR search clause for text search', async () => {
      await service.findAll(superAdminUser, { search: 'Rajesh' });
      const call = mockPrisma.booking.findMany.mock.calls[0][0];
      expect(call.where).toHaveProperty('OR');
      expect(call.where.OR.length).toBeGreaterThan(0);
    });

    it('returns paginated response shape', async () => {
      const mockBookings = [{ id: 'b1', payments: [{ totalAmount: 50000 }] }];
      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      mockPrisma.booking.count.mockResolvedValue(1);

      const result = await service.findAll(superAdminUser, { page: 2, limit: 10 });

      expect(result).toMatchObject({ total: 1, page: 2, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('totalPaid', 50000);
    });

    it('uses default pagination values when not provided', async () => {
      await service.findAll(superAdminUser, {});
      const call = mockPrisma.booking.findMany.mock.calls[0][0];
      expect(call.skip).toBe(0);
      expect(call.take).toBe(20);
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      propertyId: 'prop-1',
      applicantName: 'Rajesh Kumar',
      cellNumber: '9876543210',
      projectName: 'Green Valley',
      plotNumber: 'PLOT-101',
      bookingDate: '2024-01-15',
    };

    it('throws BadRequestException when ADMIN has no associated branch', async () => {
      const noBranchAdmin = { id: 'a1', role: Role.ADMIN, admin: {} };
      await expect(service.create(dto as any, noBranchAdmin)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when SUPER_ADMIN omits branchId', async () => {
      await expect(service.create(dto as any, superAdminUser)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when property does not exist', async () => {
      mockTransaction.mockImplementation(async (fn: any) =>
        fn({
          property: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() },
          booking: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
          bookingPayment: { createMany: jest.fn() },
          workflowHistory: { create: jest.fn() },
        }),
      );

      await expect(
        service.create({ ...dto, branchId: 'branch-1' } as any, superAdminUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates booking with BOOKING_INITIATED status by default', async () => {
      const createdBooking = { id: 'b1', bookingId: 'STH-BK-0001', status: BookingStatus.BOOKING_INITIATED };
      const txCreate = jest.fn().mockResolvedValue(createdBooking);
      const txFindUnique = jest.fn().mockResolvedValue({ ...createdBooking, payments: [], denominations: [] });

      mockTransaction.mockImplementation(async (fn: any) =>
        fn({
          property: { findUnique: jest.fn().mockResolvedValue({ id: 'prop-1' }), update: jest.fn() },
          booking: { count: jest.fn().mockResolvedValue(0), create: txCreate, findUnique: txFindUnique },
          bookingPayment: { createMany: jest.fn() },
          workflowHistory: { create: jest.fn() },
        }),
      );

      await service.create({ ...dto, branchId: 'branch-1' } as any, superAdminUser);

      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: BookingStatus.BOOKING_INITIATED }),
        }),
      );
    });
  });

  // ─── updateStatus ──────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('throws NotFoundException when booking not found', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);
      await expect(
        service.updateStatus('nonexistent', BookingStatus.TOKEN_RECEIVED, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates booking and property workflow status', async () => {
      const existingBooking = {
        id: 'b1',
        propertyId: 'prop-1',
        status: BookingStatus.BOOKING_INITIATED,
      };
      mockPrisma.booking.findUnique.mockResolvedValue(existingBooking);
      mockTransaction.mockImplementation(async (fn: any) =>
        fn({
          booking: { update: jest.fn().mockResolvedValue({ ...existingBooking, status: BookingStatus.TOKEN_RECEIVED }) },
          property: { update: jest.fn() },
          workflowHistory: { create: jest.fn() },
        }),
      );

      await service.updateStatus('b1', BookingStatus.TOKEN_RECEIVED, 'user-1');

      expect(mockTransaction).toHaveBeenCalled();
    });
  });
});
