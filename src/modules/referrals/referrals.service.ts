import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateReferralDto,
  ReferralActivityDto,
  ReferralListDto,
  ReviewReferralDto,
  CorrectReferralDto,
} from './referrals.dto';
const reviewRoles: Role[] = [
  Role.BUSINESS_MANAGER,
  Role.SENIOR_MANAGER,
  Role.DEPUTY_DIRECTOR,
  Role.EXECUTIVE_DIRECTOR,
  Role.DIRECTOR,
];
const summary = {
  id: true,
  fullName: true,
  memberId: true,
  role: true,
} as const;
@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}
  private async actor(
    userId: string,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const member = await db.member.findUnique({ where: { userId } });
    if (member) {
      if (
        member.status !== 'ACTIVE' ||
        ![Role.AGENT, ...reviewRoles].includes(member.role)
      )
        throw new ForbiddenException(
          'Customer access requires an active hierarchy member',
        );
      return member;
    }
    const admin = await db.admin.findUnique({ where: { userId } });
    if (
      !admin ||
      admin.status !== 'ACTIVE' ||
      !(await db.user.findFirst({
        where: { id: userId, status: 'ACTIVE', role: Role.ADMIN },
        select: { id: true },
      }))
    )
      throw new ForbiddenException(
        'Customer access requires an active branch Admin',
      );
    return { ...admin, role: Role.ADMIN, reportsToId: null };
  }
  private async agentScope(
    actor: Awaited<ReturnType<ReferralsService['actor']>>,
  ) {
    if (actor.role === Role.AGENT) return [actor.id];
    return (
      await this.prisma.member.findMany({
        where: {
          reportsToId: actor.id,
          role: Role.AGENT,
          branchId: actor.branchId,
        },
        select: { id: true },
      })
    ).map((agent) => agent.id);
  }
  private async scope(
    actor: Awaited<ReturnType<ReferralsService['actor']>>,
  ): Promise<Prisma.CustomerReferralWhereInput> {
    if (actor.role === Role.AGENT || actor.role === Role.BUSINESS_MANAGER)
      return {
        branchId: actor.branchId,
        assignedAgentId: { in: await this.agentScope(actor) },
      };
    if (actor.role === Role.ADMIN)
      return { branchId: actor.branchId, currentReviewerId: actor.id };
    return {
      branchId: actor.branchId,
      OR: [
        { currentReviewerId: actor.id },
        { activities: { some: { actorId: actor.id } } },
      ],
    };
  }
  async options(userId: string) {
    const actor = await this.actor(userId);
    return actor.role === Role.BUSINESS_MANAGER
      ? this.prisma.member.findMany({
          where: {
            reportsToId: actor.id,
            branchId: actor.branchId,
            role: Role.AGENT,
            status: 'ACTIVE',
            user: { status: 'ACTIVE' },
          },
          select: summary,
          orderBy: { fullName: 'asc' },
        })
      : [];
  }
  async list(userId: string, filters: ReferralListDto) {
    const actor = await this.actor(userId);
    const where = await this.scope(actor);
    const page = filters.page ?? 1,
      limit = filters.limit ?? 20;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customerReferral.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.customerReferral.count({ where }),
    ]);
    return { data, total, page, limit };
  }
  async detail(userId: string, id: string) {
    const actor = await this.actor(userId);
    const referral = await this.prisma.customerReferral.findFirst({
      where: { id, ...(await this.scope(actor)) },
      include: {
        activities: { orderBy: { createdAt: 'desc' } },
        booking: { select: { id: true, bookingId: true, status: true } },
      },
    });
    if (!referral) throw new NotFoundException('Customer not found');
    const [assignedAgent, reviewer, property] = await Promise.all([
      this.prisma.member.findUnique({
        where: { id: referral.assignedAgentId },
        select: summary,
      }),
      referral.currentReviewerId
        ? referral.status === 'WITH_ADMIN' || referral.status === 'BOOKED'
          ? this.prisma.admin
              .findUnique({
                where: { id: referral.currentReviewerId },
                select: { id: true, fullName: true, adminId: true },
              })
              .then(
                (admin) =>
                  admin && {
                    id: admin.id,
                    fullName: admin.fullName,
                    memberId: admin.adminId,
                    role: Role.ADMIN,
                  },
              )
          : this.prisma.member.findUnique({
              where: { id: referral.currentReviewerId },
              select: summary,
            })
        : null,
      this.prisma.property.findUnique({
        where: { id: referral.propertyId },
        select: {
          id: true,
          propertyName: true,
          projectName: true,
          plotNumber: true,
          squareFeet: true,
          workflowStatus: true,
        },
      }),
    ]);
    return { ...referral, assignedAgent, reviewer, property };
  }
  async create(userId: string, dto: CreateReferralDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const actor = await this.actor(userId, tx);
        if (
          ![Role.AGENT, Role.BUSINESS_MANAGER].includes(
            actor.role as 'AGENT' | 'BUSINESS_MANAGER',
          )
        )
          throw new ForbiddenException(
            'Only Agents and Business Managers can create enquiries',
          );
        const agentId =
          actor.role === Role.AGENT ? actor.id : dto.assignedAgentId;
        if (
          !agentId ||
          (actor.role === Role.AGENT &&
            dto.assignedAgentId &&
            dto.assignedAgentId !== actor.id)
        )
          throw new ForbiddenException(
            'Select an Agent reporting directly to you',
          );
        const agent = await tx.member.findFirst({
          where: {
            id: agentId,
            branchId: actor.branchId,
            role: Role.AGENT,
            status: 'ACTIVE',
            user: { status: 'ACTIVE' },
            ...(actor.role === Role.BUSINESS_MANAGER
              ? { reportsToId: actor.id }
              : {}),
          },
        });
        if (!agent)
          throw new ForbiddenException(
            'Agent is not active in your direct reporting team',
          );
        const existing = await tx.customerReferral.findUnique({
          where: { requestKey: dto.requestKey },
        });
        if (existing) {
          if (
            existing.createdById !== actor.id ||
            existing.assignedAgentId !== agent.id ||
            existing.customerName !== dto.customerName ||
            existing.customerPhone !== dto.customerPhone ||
            existing.propertyId !== dto.propertyId ||
            existing.notes !== dto.notes
          )
            throw new ConflictException(
              'This request was already saved. Reopen the form to create a different enquiry',
            );
          return existing;
        }
        const property = await tx.property.findFirst({
          where: {
            id: dto.propertyId,
            branchId: actor.branchId,
            workflowStatus: 'AVAILABLE',
          },
        });
        if (!property)
          throw new BadRequestException(
            'Select an available property in your branch',
          );
        return tx.customerReferral.create({
          data: {
            requestKey: dto.requestKey,
            branchId: actor.branchId,
            createdById: actor.id,
            assignedAgentId: agent.id,
            customerName: dto.customerName,
            customerPhone: dto.customerPhone,
            propertyId: property.id,
            notes: dto.notes,
            activities: {
              create: {
                actorId: actor.id,
                actorName: actor.fullName,
                action: actor.role === Role.AGENT ? 'CREATED' : 'ASSIGNED',
                notes: dto.notes,
              },
            },
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'This submission was already saved. Refresh your customer list',
        );
      throw error;
    }
  }
  async activity(userId: string, id: string, dto: ReferralActivityDto) {
    return this.prisma.$transaction(async (tx) => {
      const actor = await this.actor(userId, tx);
      if (actor.role !== Role.AGENT)
        throw new ForbiddenException(
          'Only the assigned Agent can record customer follow-up',
        );
      const record = await tx.customerReferral.findFirst({
        where: { id, assignedAgentId: actor.id, branchId: actor.branchId },
      });
      if (!record) throw new NotFoundException('Customer not found');
      if (
        !['ASSIGNED', 'IN_PROGRESS', 'RETURNED_TO_AGENT'].includes(
          record.status,
        )
      )
        throw new ConflictException(
          'This referral is under review and cannot be edited',
        );
      let reviewerId: string | null = null;
      if (dto.action === 'SUBMIT') {
        const manager = actor.reportsToId
          ? await tx.member.findFirst({
              where: {
                id: actor.reportsToId,
                role: Role.BUSINESS_MANAGER,
                branchId: actor.branchId,
                status: 'ACTIVE',
                user: { status: 'ACTIVE' },
              },
            })
          : null;
        if (!manager)
          throw new BadRequestException(
            'An active Business Manager must be assigned before submission',
          );
        const property = await tx.property.findFirst({
          where: {
            id: record.propertyId,
            branchId: actor.branchId,
            workflowStatus: 'AVAILABLE',
          },
        });
        if (!property)
          throw new ConflictException(
            'The property is no longer available. Contact your Business Manager',
          );
        reviewerId = manager.id;
      }
      const changed = await tx.customerReferral.updateMany({
        where: { id, version: dto.version, status: record.status },
        data: {
          status:
            dto.action === 'SUBMIT'
              ? 'WITH_BUSINESS_MANAGER'
              : record.status === 'RETURNED_TO_AGENT'
                ? 'RETURNED_TO_AGENT'
                : 'IN_PROGRESS',
          currentReviewerId: reviewerId,
          ...(dto.action === 'SUBMIT'
            ? { nextActionAt: null }
            : dto.nextActionAt
              ? { nextActionAt: new Date(dto.nextActionAt) }
              : {}),
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1)
        throw new ConflictException(
          'This customer changed. Refresh before trying again',
        );
      await tx.customerReferralActivity.create({
        data: {
          referralId: id,
          actorId: actor.id,
          actorName: actor.fullName,
          action: dto.action,
          notes: dto.notes,
        },
      });
      return tx.customerReferral.findUnique({ where: { id } });
    });
  }
  async correct(userId: string, id: string, dto: CorrectReferralDto) {
    return this.prisma.$transaction(async (tx) => {
      const actor = await this.actor(userId, tx);
      if (actor.role !== Role.AGENT)
        throw new ForbiddenException(
          'Only the assigned Agent can correct details',
        );
      const record = await tx.customerReferral.findFirst({
        where: {
          id,
          assignedAgentId: actor.id,
          branchId: actor.branchId,
          status: 'RETURNED_TO_AGENT',
        },
      });
      if (!record) throw new NotFoundException('No returned referral found');
      if (
        !(await tx.property.findFirst({
          where: {
            id: dto.propertyId,
            branchId: actor.branchId,
            workflowStatus: 'AVAILABLE',
          },
        }))
      )
        throw new BadRequestException('Select an available branch property');
      const changed = await tx.customerReferral.updateMany({
        where: {
          id,
          version: dto.version,
          status: 'RETURNED_TO_AGENT',
          assignedAgentId: actor.id,
        },
        data: {
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          propertyId: dto.propertyId,
          notes: dto.notes,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('Refresh this referral before saving');
      await tx.customerReferralActivity.create({
        data: {
          referralId: id,
          actorId: actor.id,
          actorName: actor.fullName,
          action: 'CORRECTED',
          notes: dto.notes,
        },
      });
      return tx.customerReferral.findUnique({ where: { id } });
    });
  }
  async review(userId: string, id: string, dto: ReviewReferralDto) {
    return this.prisma.$transaction(async (tx) => {
      const actor = await this.actor(userId, tx);
      if (!reviewRoles.includes(actor.role))
        throw new ForbiddenException('Reviewer access required');
      const handoff = dto.action === 'SEND_TO_ADMIN';
      if (handoff && actor.role !== Role.DIRECTOR)
        throw new ForbiddenException(
          'Only the Director can send an approved referral to the branch Admin',
        );
      const record = await tx.customerReferral.findFirst({
        where: {
          id,
          branchId: actor.branchId,
          currentReviewerId: actor.id,
          status: handoff ? 'DIRECTOR_APPROVED' : `WITH_${actor.role}`,
        },
      });
      if (!record)
        throw new NotFoundException(
          'This referral is not awaiting your review',
        );
      // Verify the saved reporting chain still leads from the Agent to this reviewer.
      let nextId: string | null = record.assignedAgentId;
      const visited = new Set<string>();
      let inChain = false;
      while (nextId && !visited.has(nextId)) {
        if (nextId === actor.id) {
          inChain = true;
          break;
        }
        visited.add(nextId);
        const link = await tx.member.findFirst({
          where: { id: nextId, branchId: actor.branchId },
          select: { reportsToId: true },
        });
        nextId = link?.reportsToId ?? null;
      }
      if (!inChain)
        throw new ForbiddenException(
          'Reporting hierarchy changed. Contact your administrator',
        );
      let status: string;
      let currentReviewerId: string | null = actor.id;
      if (dto.action === 'RETURN') {
        status = 'RETURNED_TO_AGENT';
        currentReviewerId = null;
      } else if (handoff) {
        const admin = await tx.admin.findFirst({
          where: {
            branchId: actor.branchId,
            status: 'ACTIVE',
            user: { status: 'ACTIVE', role: Role.ADMIN },
          },
          orderBy: { createdAt: 'asc' },
        });
        if (!admin)
          throw new BadRequestException(
            'An active Admin must be assigned to your branch before handoff',
          );
        status = 'WITH_ADMIN';
        currentReviewerId = admin.id;
      } else {
        if (
          !(await tx.property.findFirst({
            where: {
              id: record.propertyId,
              branchId: actor.branchId,
              workflowStatus: 'AVAILABLE',
            },
          }))
        )
          throw new ConflictException(
            'Property is no longer available. Return for correction',
          );
        if (dto.action === 'APPROVE') {
          if (actor.role !== Role.DIRECTOR)
            throw new ForbiddenException(
              'Only Director can complete hierarchy review',
            );
          const admin = await tx.admin.findFirst({
            where: {
              branchId: actor.branchId,
              status: 'ACTIVE',
              user: { status: 'ACTIVE', role: Role.ADMIN },
            },
            orderBy: { createdAt: 'asc' },
          });
          if (!admin)
            throw new BadRequestException(
              'An active Admin must be assigned to your branch before Director approval',
            );
          status = 'WITH_ADMIN';
          currentReviewerId = admin.id;
        } else {
          const nextRole = reviewRoles[reviewRoles.indexOf(actor.role) + 1];
          if (!nextRole)
            throw new BadRequestException(
              'Director is the final hierarchy reviewer',
            );
          const next = actor.reportsToId
            ? await tx.member.findFirst({
                where: {
                  id: actor.reportsToId,
                  role: nextRole,
                  branchId: actor.branchId,
                  status: 'ACTIVE',
                  user: { status: 'ACTIVE' },
                },
              })
            : null;
          if (!next)
            throw new BadRequestException(
              `An active ${nextRole.replace(/_/g, ' ')} must be assigned as your reporting manager`,
            );
          currentReviewerId = next.id;
          status = `WITH_${next.role}`;
        }
      }
      const changed = await tx.customerReferral.updateMany({
        where: {
          id,
          version: dto.version,
          currentReviewerId: actor.id,
          status: record.status,
        },
        data: { status, currentReviewerId, version: { increment: 1 } },
      });
      if (changed.count !== 1)
        throw new ConflictException(
          'This referral changed. Refresh before reviewing',
        );
      if (dto.action === 'APPROVE') {
        await tx.customerReferralActivity.create({
          data: {
            referralId: id,
            actorId: actor.id,
            actorName: actor.fullName,
            action: 'DIRECTOR_APPROVED',
            notes: dto.notes,
          },
        });
      }
      await tx.customerReferralActivity.create({
        data: {
          referralId: id,
          actorId: actor.id,
          actorName: actor.fullName,
          action:
            dto.action === 'RETURN'
              ? 'RETURNED_TO_AGENT'
              : handoff || dto.action === 'APPROVE'
                ? 'SENT_TO_ADMIN'
                : status,
          notes: dto.notes,
        },
      });
      return tx.customerReferral.findUnique({ where: { id } });
    });
  }
}
