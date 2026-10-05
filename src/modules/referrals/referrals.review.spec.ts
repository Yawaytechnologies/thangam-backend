import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReferralsService } from './referrals.service';

describe('Hierarchy referral review', () => {
  let db: any;
  let service: ReferralsService;
  const roles = [
    'BUSINESS_MANAGER',
    'SENIOR_MANAGER',
    'DEPUTY_DIRECTOR',
    'EXECUTIVE_DIRECTOR',
    'DIRECTOR',
  ];
  const actor = (role = 'BUSINESS_MANAGER') => ({
    id: 'reviewer',
    userId: 'user',
    role,
    status: 'ACTIVE',
    branchId: 'branch',
    fullName: 'Reviewer',
    reportsToId: 'next',
  });
  beforeEach(() => {
    db = {
      member: {
        findUnique: jest.fn().mockResolvedValue(actor()),
        findFirst: jest.fn(),
      },
      admin: { findUnique: jest.fn(), findFirst: jest.fn() },
      user: { findFirst: jest.fn() },
      property: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'plot',
          projectName: 'Project',
          plotNumber: 'P-1',
          squareFeet: 1000,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      booking: {
        count: jest.fn().mockResolvedValue(1),
        create: jest
          .fn()
          .mockResolvedValue({ id: 'booking', bookingId: 'TH-2' }),
      },
      workflowHistory: { create: jest.fn() },
      customerReferral: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'ref',
          branchId: 'branch',
          assignedAgentId: 'agent',
          currentReviewerId: 'reviewer',
          status: 'WITH_BUSINESS_MANAGER',
          propertyId: 'plot',
          version: 0,
          bookingId: null,
          customerName: 'Customer',
          customerPhone: '9876543210',
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn(),
      },
      customerReferralActivity: { create: jest.fn() },
    };
    db.$transaction = (fn: any) => fn(db);
    service = new ReferralsService(db);
  });
  it.each(roles.slice(0, -1))(
    'forwards %s only to its next configured hierarchy role',
    async (role) => {
      const nextRole = roles[roles.indexOf(role) + 1];
      db.member.findUnique.mockResolvedValue(actor(role));
      db.customerReferral.findFirst.mockResolvedValue({
        assignedAgentId: 'agent',
        status: `WITH_${role}`,
        propertyId: 'plot',
      });
      db.member.findFirst
        .mockResolvedValueOnce({ reportsToId: 'reviewer' })
        .mockResolvedValueOnce({ id: 'next', role: nextRole });
      await service.review('user', 'ref', {
        action: 'FORWARD',
        notes: 'Reviewed',
        version: 2,
      });
      expect(db.member.findFirst).toHaveBeenLastCalledWith({
        where: {
          id: 'next',
          role: nextRole,
          branchId: 'branch',
          status: 'ACTIVE',
          user: { status: 'ACTIVE' },
        },
      });
      expect(db.customerReferral.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'ref',
            version: 2,
            currentReviewerId: 'reviewer',
            status: `WITH_${role}`,
          },
          data: {
            status: `WITH_${nextRole}`,
            currentReviewerId: 'next',
            version: { increment: 1 },
          },
        }),
      );
    },
  );
  it('rejects a reviewer who does not own the current stage', async () => {
    db.customerReferral.findFirst.mockResolvedValue(null);
    await expect(
      service.review('user', 'ref', {
        action: 'RETURN',
        notes: 'Fix',
        version: 0,
      }),
    ).rejects.toThrow(NotFoundException);
    expect(db.customerReferral.updateMany).not.toHaveBeenCalled();
  });
  it('rejects a changed or cyclic reporting chain', async () => {
    db.member.findFirst.mockResolvedValue({ reportsToId: 'agent' });
    await expect(
      service.review('user', 'ref', {
        action: 'FORWARD',
        notes: 'Review',
        version: 0,
      }),
    ).rejects.toThrow(ForbiddenException);
  });
  it('blocks forwarding when the next official is missing', async () => {
    db.member.findFirst
      .mockResolvedValueOnce({ reportsToId: 'reviewer' })
      .mockResolvedValueOnce(null);
    await expect(
      service.review('user', 'ref', {
        action: 'FORWARD',
        notes: 'Review',
        version: 0,
      }),
    ).rejects.toThrow(BadRequestException);
  });
  it('returns to the Agent without requiring an available property', async () => {
    db.member.findFirst.mockResolvedValue({ reportsToId: 'reviewer' });
    db.property.findFirst.mockResolvedValue(null);
    await service.review('user', 'ref', {
      action: 'RETURN',
      notes: 'Choose another plot',
      version: 0,
    });
    expect(db.customerReferral.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: 'RETURNED_TO_AGENT',
          currentReviewerId: null,
          version: { increment: 1 },
        },
      }),
    );
    expect(db.customerReferralActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        notes: 'Choose another plot',
        action: 'RETURNED_TO_AGENT',
      }),
    });
  });
  it('rejects double or stale forwarding without writing an audit entry', async () => {
    db.member.findFirst.mockResolvedValue({ reportsToId: 'reviewer' });
    db.customerReferral.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.review('user', 'ref', {
        action: 'RETURN',
        notes: 'Fix',
        version: 0,
      }),
    ).rejects.toThrow(ConflictException);
    expect(db.customerReferralActivity.create).not.toHaveBeenCalled();
  });
  it('Director approval sends the referral to the active branch Admin without creating a booking', async () => {
    db.member.findUnique.mockResolvedValue(actor('DIRECTOR'));
    db.member.findFirst.mockResolvedValue({ reportsToId: 'reviewer' });
    db.admin.findFirst.mockResolvedValue({
      id: 'branch-admin',
      branchId: 'branch',
    });
    await service.review('user', 'ref', {
      action: 'APPROVE',
      notes: 'Reviewed',
      version: 0,
    });
    expect(db.customerReferral.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: 'WITH_ADMIN',
          currentReviewerId: 'branch-admin',
          version: { increment: 1 },
        },
      }),
    );
    expect(db.customerReferralActivity.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        action: 'DIRECTOR_APPROVED',
        actorId: 'reviewer',
      }),
    });
    expect(db.customerReferralActivity.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        action: 'SENT_TO_ADMIN',
        actorId: 'reviewer',
      }),
    });
    expect(db.booking.create).not.toHaveBeenCalled();
  });
  it('does not approve or hand off when the Director branch has no active Admin', async () => {
    db.member.findUnique.mockResolvedValue(actor('DIRECTOR'));
    db.member.findFirst.mockResolvedValue({ reportsToId: 'reviewer' });
    db.admin.findFirst.mockResolvedValue(null);
    await expect(
      service.review('user', 'ref', {
        action: 'APPROVE',
        notes: 'Reviewed',
        version: 0,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(db.customerReferral.updateMany).not.toHaveBeenCalled();
  });
  it('sends an approved referral only to an active Admin in the Director branch', async () => {
    db.member.findUnique.mockResolvedValue(actor('DIRECTOR'));
    db.member.findFirst
      .mockResolvedValueOnce({ reportsToId: 'reviewer' })
      .mockResolvedValueOnce({ reportsToId: null });
    db.customerReferral.findFirst.mockResolvedValue({
      id: 'ref',
      assignedAgentId: 'agent',
      status: 'DIRECTOR_APPROVED',
      currentReviewerId: 'reviewer',
      branchId: 'branch',
      propertyId: 'plot',
    });
    db.admin.findFirst.mockResolvedValue({
      id: 'branch-admin',
      branchId: 'branch',
    });
    await service.review('user', 'ref', {
      action: 'SEND_TO_ADMIN',
      notes: 'Approved; please verify availability',
      version: 3,
    });
    expect(db.admin.findFirst).toHaveBeenCalledWith({
      where: {
        branchId: 'branch',
        status: 'ACTIVE',
        user: { status: 'ACTIVE', role: 'ADMIN' },
      },
      orderBy: { createdAt: 'asc' },
    });
    expect(db.customerReferral.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'ref',
          version: 3,
          status: 'DIRECTOR_APPROVED',
          currentReviewerId: 'reviewer',
        },
        data: {
          status: 'WITH_ADMIN',
          currentReviewerId: 'branch-admin',
          version: { increment: 1 },
        },
      }),
    );
    expect(db.customerReferralActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'SENT_TO_ADMIN' }),
    });
  });
  it('requires an active branch Admin before Director handoff', async () => {
    db.member.findUnique.mockResolvedValue(actor('DIRECTOR'));
    db.member.findFirst
      .mockResolvedValueOnce({ reportsToId: 'reviewer' })
      .mockResolvedValueOnce({ reportsToId: null });
    db.customerReferral.findFirst.mockResolvedValue({
      id: 'ref',
      assignedAgentId: 'agent',
      status: 'DIRECTOR_APPROVED',
      currentReviewerId: 'reviewer',
      branchId: 'branch',
    });
    db.admin.findFirst.mockResolvedValue(null);
    await expect(
      service.review('user', 'ref', {
        action: 'SEND_TO_ADMIN',
        notes: 'Approved',
        version: 0,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(db.customerReferral.updateMany).not.toHaveBeenCalled();
  });
  it('only the Agent can save returned customer corrections', async () => {
    await expect(
      service.correct('user', 'ref', {
        customerName: 'Customer',
        customerPhone: '9876543210',
        propertyId: 'plot',
        notes: 'Corrected',
        version: 0,
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
