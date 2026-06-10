import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentsService } from './documents.service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

const upload = jest.fn();
const createSignedUrl = jest.fn();

const mockPrisma = {
  booking: { findUnique: jest.fn() },
  billing: { findUnique: jest.fn() },
  document: { create: jest.fn() },
};

const imageFile = {
  originalname: 'site.png',
  mimetype: 'image/png',
  size: 1024,
  buffer: Buffer.from('image'),
} as Express.Multer.File;

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    (createClient as jest.Mock).mockReturnValue({
      storage: {
        from: jest.fn().mockReturnValue({
          upload,
          createSignedUrl,
        }),
      },
    });
    upload.mockResolvedValue({ error: null });
    createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example.com/site.png' },
      error: null,
    });
    mockPrisma.booking.findUnique.mockResolvedValue({ id: 'booking-1' });
    mockPrisma.billing.findUnique.mockResolvedValue({ id: 'billing-1' });
    mockPrisma.document.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'doc-1',
        ...data,
        createdAt: new Date(),
        isVerified: false,
      }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'supabase.url') return 'https://supabase.example.com';
              if (key === 'supabase.serviceRoleKey') return 'service-role-key';
              if (key === 'supabase.bucket') return 'sth-files';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    jest.clearAllMocks();
  });

  it('uploads booking images as BOOKING_IMAGE documents', async () => {
    await service.uploadBookingImages('booking-1', [imageFile], 'user-1');

    expect(mockPrisma.booking.findUnique).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      select: { id: true },
    });
    expect(mockPrisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: 'booking',
          entityId: 'booking-1',
          documentType: DocumentType.BOOKING_IMAGE,
          uploadedBy: 'user-1',
        }),
      }),
    );
  });

  it('uploads billing images as BILLING_IMAGE documents', async () => {
    await service.uploadBillingImages('billing-1', [imageFile], 'user-1');

    expect(mockPrisma.billing.findUnique).toHaveBeenCalledWith({
      where: { id: 'billing-1' },
      select: { id: true },
    });
    expect(mockPrisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: 'billing',
          entityId: 'billing-1',
          documentType: DocumentType.BILLING_IMAGE,
        }),
      }),
    );
  });

  it('rejects empty image uploads', async () => {
    await expect(
      service.uploadBookingImages('booking-1', [], 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when billing is missing', async () => {
    mockPrisma.billing.findUnique.mockResolvedValue(null);

    await expect(
      service.uploadBillingImages('missing', [imageFile], 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
