import type { PrismaClient } from '@prisma/client';

const AUTO_CODE_PATTERN = /^M-(\d+)$/;

export async function generateMaterialCode(
  prisma: PrismaClient,
  tenantId: string,
): Promise<string> {
  const existing = await prisma.material.findMany({
    where: {
      tenantId,
      materialCode: { startsWith: 'M-' },
    },
    select: { materialCode: true },
  });

  let maxSeq = 0;
  for (const { materialCode } of existing) {
    const match = AUTO_CODE_PATTERN.exec(materialCode);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }

  const next = maxSeq + 1;
  return `M-${String(next).padStart(3, '0')}`;
}
