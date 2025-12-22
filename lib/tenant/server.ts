import { PrismaClient } from '@prisma/client'
import { prisma } from './prisma'

// Prismaクライアントを取得
export function getCurrentPrismaClient(): PrismaClient {
  return prisma
}

// API Route用: リクエストからPrismaクライアントを取得
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getPrismaClientFromRequest(request: Request): PrismaClient {
  return prisma
}
