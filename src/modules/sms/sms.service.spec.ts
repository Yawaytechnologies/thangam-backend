import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SmsService } from './sms.service';

describe('SmsService', () => {
  const customer = {
    id: 'booking-id',
    bookingId: 'BK-1',
    applicantName: 'Test Customer',
    cellNumber: '9876543210',
    projectName: 'Test project',
    plotNumber: '1',
  };
  const upsert = jest.fn().mockResolvedValue({});
  const tx = { smsMessage: { upsert } } as unknown as Prisma.TransactionClient;
  beforeEach(() => jest.clearAllMocks());

  it('does not queue or send when disabled', async () => {
    const service = new SmsService({} as PrismaService, new ConfigService({}));
    await service.booking(tx, customer, 'BOOKED');
    expect(upsert).not.toHaveBeenCalled();
    expect(await service.sendSms(customer.cellNumber, 'Test')).toMatchObject({
      skipped: true,
    });
  });

  it('queues the booking customer number with a stable event key', async () => {
    const service = new SmsService(
      {} as PrismaService,
      new ConfigService({ SMS_ENABLED: 'true' }),
    );
    await service.booking(
      tx,
      { ...customer, cellNumber: '+91 9876543210' },
      'BOOKED',
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventKey: 'booking:booking-id:BOOKED' },
        create: expect.objectContaining({ recipient: customer.cellNumber }),
        update: {},
      }),
    );
  });

  it('does not queue a zero payment and rejects invalid customer numbers', async () => {
    const service = new SmsService(
      {} as PrismaService,
      new ConfigService({ SMS_ENABLED: 'true' }),
    );
    await service.payment(tx, customer, {
      id: 'bill',
      totalReceived: 0,
      totalBalance: 100,
    });
    expect(upsert).not.toHaveBeenCalled();
    await expect(
      service.booking(tx, { ...customer, cellNumber: '123' }, 'BOOKED'),
    ).rejects.toThrow('Invalid customer mobile number');
  });
});
