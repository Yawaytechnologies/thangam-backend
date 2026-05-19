import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(query: string) {
    const q = query.trim();

    const [
      members,
      branches,
      admins,
      properties,
      bookings,
      billing,
      notifications,
    ] = await Promise.all([
      // Members — fullName, memberId, phone
      this.prisma.member.findMany({
        where: {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { memberId: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          memberId: true,
          fullName: true,
          role: true,
          phone: true,
          status: true,
          branchId: true,
          createdAt: true,
        },
      }),

      // Branches — name, branchCode, city
      this.prisma.branch.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { branchCode: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          branchCode: true,
          name: true,
          city: true,
          status: true,
          createdAt: true,
        },
      }),

      // Admins — fullName, adminId, phone, email
      this.prisma.admin.findMany({
        where: {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { adminId: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          adminId: true,
          fullName: true,
          phone: true,
          email: true,
          status: true,
          branchId: true,
          createdAt: true,
        },
      }),

      // Properties — propertyName, propertyCode, plotNumber, projectName
      this.prisma.property.findMany({
        where: {
          OR: [
            { propertyName: { contains: q, mode: 'insensitive' } },
            { propertyCode: { contains: q, mode: 'insensitive' } },
            { plotNumber: { contains: q, mode: 'insensitive' } },
            { projectName: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          propertyId: true,
          propertyName: true,
          propertyCode: true,
          projectName: true,
          plotNumber: true,
          workflowStatus: true,
          createdAt: true,
        },
      }),

      // Bookings — bookingId, applicantName, cellNumber, projectName
      this.prisma.booking.findMany({
        where: {
          OR: [
            { bookingId: { contains: q, mode: 'insensitive' } },
            { applicantName: { contains: q, mode: 'insensitive' } },
            { cellNumber: { contains: q, mode: 'insensitive' } },
            { projectName: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          bookingId: true,
          applicantName: true,
          cellNumber: true,
          projectName: true,
          plotNumber: true,
          status: true,
          bookingDate: true,
          branchId: true,
          createdAt: true,
        },
      }),

      // Billing — billingId, buyerName, buyerPhone
      this.prisma.billing.findMany({
        where: {
          OR: [
            { billingId: { contains: q, mode: 'insensitive' } },
            { buyerName: { contains: q, mode: 'insensitive' } },
            { buyerPhone: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          billingId: true,
          buyerName: true,
          buyerPhone: true,
          amountInNumbers: true,
          totalBalance: true,
          status: true,
          createdAt: true,
        },
      }),

      // Notifications — title (via NotificationRecipient for completeness)
      this.prisma.notification.findMany({
        where: {
          title: { contains: q, mode: 'insensitive' },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          priority: true,
          relatedModule: true,
          relatedEntityId: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      members,
      branches,
      admins,
      properties,
      bookings,
      billing,
      notifications,
    };
  }
}
