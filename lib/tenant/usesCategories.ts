import type { PrismaClient } from '@prisma/client';

export async function tenantUsesCategories(
  prisma: PrismaClient,
  tenantId: string,
): Promise<boolean> {
  const count = await prisma.category.count({ where: { tenantId } });
  return count > 0;
}
