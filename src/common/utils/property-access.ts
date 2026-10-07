import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface PropertyViewer {
  id: string;
  role: Role;
  admin?: { branchId: string | null } | null;
  member?: { branchId: string | null } | null;
}

export function propertyBranch(user: PropertyViewer): string | undefined {
  if (user.role === Role.SUPER_ADMIN) return undefined;
  const branchId =
    user.role === Role.ADMIN ? user.admin?.branchId : user.member?.branchId;
  if (!branchId)
    throw new ForbiddenException('Your account has no assigned branch');
  return branchId;
}

export function propertyReadBranch(user: PropertyViewer): string | undefined {
  if (user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN) {
    return undefined;
  }
  return propertyBranch(user);
}

export async function assertPropertyReadAccess(
  prisma: PrismaService,
  id: string,
  user: PropertyViewer,
) {
  const branchId = propertyReadBranch(user);
  const property = await prisma.property.findFirst({
    where: { id, ...(branchId ? { branchId } : {}) },
    select: { id: true },
  });
  if (!property)
    throw new NotFoundException(
      'Property not found in your accessible branches',
    );
}

export async function assertPropertyAccess(
  prisma: PrismaService,
  id: string,
  user: PropertyViewer,
) {
  const branchId = propertyBranch(user);
  const property = await prisma.property.findFirst({
    where: { id, ...(branchId ? { branchId } : {}) },
    select: { id: true },
  });
  if (!property)
    throw new NotFoundException(
      'Property not found in your accessible branches',
    );
}
