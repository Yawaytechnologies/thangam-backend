import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReferralsService } from './referrals.service';

describe('Customer assignment and follow-up permissions', () => {
  const manager = {
    id: 'manager',
    userId: 'manager-user',
    fullName: 'Manager',
    role: 'BUSINESS_MANAGER',
    branchId: 'branch-a',
    status: 'ACTIVE',
  };
  const agent = {
    id: 'agent',
    userId: 'agent-user',
    fullName: 'Agent',
    role: 'AGENT',
    branchId: 'branch-a',
    reportsToId: 'manager',
    status: 'ACTIVE',
  };
  let db: any;
  let service: ReferralsService;
  beforeEach(() => {
    db = {
      member: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      property: { findFirst: jest.fn(), findUnique: jest.fn() },
      customerReferral: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
      },
      customerReferralActivity: { create: jest.fn() },
      $transaction: jest.fn((input: any) =>
        typeof input === 'function' ? input(db) : Promise.all(input),
      ),
    };
    service = new ReferralsService(db);
    db.member.findUnique.mockResolvedValue(agent);
    db.customerReferral.findFirst.mockResolvedValue({
      id: 'customer',
      assignedAgentId: 'agent',
      status: 'ASSIGNED',
      propertyId: 'property',
      version: 0,
    });
    db.customerReferral.updateMany.mockResolvedValue({ count: 1 });
    db.property.findFirst.mockResolvedValue({ id: 'property' });
  });
  const create = {
    requestKey: 'request-key-123456',
    customerName: 'Customer',
    customerPhone: '9876543210',
    propertyId: 'property',
    assignedAgentId: 'agent',
    notes: 'Interested in a plot',
  };
  it('assigns only to an active same-branch direct Agent and preserves source and history', async () => {
    db.member.findUnique.mockResolvedValue(manager);
    db.member.findFirst.mockResolvedValue(agent);
    await service.create('manager-user', create);
    expect(db.member.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'agent',
        reportsToId: 'manager',
        role: 'AGENT',
        branchId: 'branch-a',
        status: 'ACTIVE',
        user: { status: 'ACTIVE' },
      }),
    });
    expect(db.customerReferral.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        createdById: 'manager',
        assignedAgentId: 'agent',
        branchId: 'branch-a',
        activities: {
          create: expect.objectContaining({
            action: 'ASSIGNED',
            actorId: 'manager',
          }),
        },
      }),
    });
  });
  it('rejects another managers Agent', async () => {
    db.member.findUnique.mockResolvedValue(manager);
    db.member.findFirst.mockResolvedValue(null);
    await expect(service.create('manager-user', create)).rejects.toThrow(
      ForbiddenException,
    );
    expect(db.customerReferral.create).not.toHaveBeenCalled();
  });
  it('returns the saved record when the same create request is retried', async () => {
    db.member.findFirst.mockResolvedValue(agent);
    const saved = { ...create, id: 'saved', createdById: agent.id };
    db.customerReferral.findUnique.mockResolvedValue(saved);
    await expect(service.create('agent-user', create)).resolves.toEqual(saved);
    expect(db.customerReferral.create).not.toHaveBeenCalled();
  });
  it('does not reuse a saved request key for changed customer details', async () => {
    db.member.findFirst.mockResolvedValue(agent);
    db.customerReferral.findUnique.mockResolvedValue({
      ...create,
      createdById: agent.id,
    });
    await expect(
      service.create('agent-user', {
        ...create,
        customerName: 'Different customer',
      }),
    ).rejects.toThrow(ConflictException);
    expect(db.customerReferral.create).not.toHaveBeenCalled();
  });
  it('prevents an Agent assigning to someone else', async () => {
    await expect(
      service.create('agent-user', { ...create, assignedAgentId: 'other' }),
    ).rejects.toThrow(ForbiddenException);
  });
  it('rejects unavailable or other-branch properties', async () => {
    db.member.findFirst.mockResolvedValue(agent);
    db.property.findFirst.mockResolvedValue(null);
    await expect(service.create('agent-user', create)).rejects.toThrow(
      BadRequestException,
    );
    expect(db.property.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'property',
        branchId: 'branch-a',
        workflowStatus: 'AVAILABLE',
      },
    });
  });
  it('restricts the customer list to actual direct Agents', async () => {
    db.member.findUnique.mockResolvedValue(manager);
    db.member.findMany.mockResolvedValue([{ id: 'agent' }]);
    db.customerReferral.findMany.mockResolvedValue([]);
    db.customerReferral.count.mockResolvedValue(0);
    await service.list('manager-user', { page: 1, limit: 20 });
    expect(db.customerReferral.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { branchId: 'branch-a', assignedAgentId: { in: ['agent'] } },
      }),
    );
  });
  it('hides a customer belonging to another Agent', async () => {
    db.customerReferral.findFirst.mockResolvedValue(null);
    await expect(
      service.detail('agent-user', 'other-customer'),
    ).rejects.toThrow(NotFoundException);
  });
  it('blocks unrelated roles even when the service is called directly', async () => {
    db.member.findUnique.mockResolvedValue({ ...agent, role: 'ADMIN' });
    await expect(
      service.list('director-user', { page: 1, limit: 20 }),
    ).rejects.toThrow(ForbiddenException);
  });
  it('records follow-up with optimistic concurrency and an audit event', async () => {
    await service.activity('agent-user', 'customer', {
      action: 'FOLLOW_UP',
      notes: 'Call tomorrow',
      version: 0,
      nextActionAt: '2026-10-05T10:00:00Z',
    });
    expect(db.customerReferral.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'customer', version: 0, status: 'ASSIGNED' },
        data: expect.objectContaining({
          status: 'IN_PROGRESS',
          version: { increment: 1 },
        }),
      }),
    );
    expect(db.customerReferralActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'FOLLOW_UP', actorId: 'agent' }),
    });
  });
  it('submits to the assigned Business Manager, not an arbitrary reviewer', async () => {
    db.member.findFirst.mockResolvedValue(manager);
    await service.activity('agent-user', 'customer', {
      action: 'SUBMIT',
      notes: 'Ready to book',
      version: 0,
    });
    expect(db.customerReferral.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'WITH_BUSINESS_MANAGER',
          currentReviewerId: 'manager',
          nextActionAt: null,
        }),
      }),
    );
  });
  it('blocks submission without an active Business Manager', async () => {
    db.member.findFirst.mockResolvedValue(null);
    await expect(
      service.activity('agent-user', 'customer', {
        action: 'SUBMIT',
        notes: 'Ready',
        version: 0,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(db.customerReferral.updateMany).not.toHaveBeenCalled();
  });
  it('rejects a stale or duplicate activity without adding history', async () => {
    db.customerReferral.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.activity('agent-user', 'customer', {
        action: 'FOLLOW_UP',
        notes: 'Call',
        version: 0,
      }),
    ).rejects.toThrow(ConflictException);
    expect(db.customerReferralActivity.create).not.toHaveBeenCalled();
  });
  it('prevents Agents editing a submitted referral', async () => {
    db.customerReferral.findFirst.mockResolvedValue({
      status: 'WITH_BUSINESS_MANAGER',
    });
    await expect(
      service.activity('agent-user', 'customer', {
        action: 'FOLLOW_UP',
        notes: 'Change',
        version: 1,
      }),
    ).rejects.toThrow(ConflictException);
  });
});
