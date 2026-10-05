import type { PrismaService } from '../../prisma/prisma.service';

/** Only saved reporting links grant downline access; branches and titles do not. */
export async function getDescendantMemberIds(
  prisma: PrismaService,
  memberId: string,
): Promise<string[]> {
  const visited = new Set([memberId]);
  const descendants: string[] = [];
  let parents = [memberId];
  while (parents.length) {
    const children = await prisma.member.findMany({
      where: { reportsToId: { in: parents } },
      select: { id: true },
    });
    const next: string[] = [];
    for (const child of children) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      descendants.push(child.id);
      next.push(child.id);
    }
    parents = next;
  }
  return descendants;
}
