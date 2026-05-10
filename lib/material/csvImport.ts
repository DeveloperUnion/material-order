import type { PrismaClient } from '@prisma/client'
import { parseCsv } from '@/lib/csv/parse'

export const CSV_HEADERS = {
  name: '資材名',
  materialCode: '資材コード',
  category: 'カテゴリ',
  size: 'サイズ',
  weightKg: '重量(kg)',
} as const

const REQUIRED_HEADERS = [CSV_HEADERS.name, CSV_HEADERS.weightKg]
const KNOWN_HEADERS = Object.values(CSV_HEADERS)
const MAX_ROWS = 5000

const AUTO_CODE_PREFIX = 'M-'
const AUTO_CODE_PATTERN = /^M-(\d+)$/

export type ImportRowError = {
  row: number
  materialCode: string
  message: string
}

export type PresentFields = {
  materialCode: boolean
  category: boolean
  size: boolean
}

export type ImportPlan = {
  toCreate: number
  toUpdate: number
  autoCodes: number
  newCategories: number
  total: number
  errors: ImportRowError[]
  newCategoryNames: string[]
  autoCodeRange: { from: string; to: string } | null
  skippedHeaders: string[]
}

export type ImportResult = {
  created: number
  updated: number
  autoCodesAssigned: { row: number; code: string }[]
  newCategoryNames: string[]
  errors: ImportRowError[]
  skippedHeaders: string[]
}

type ParsedRow = {
  rowNumber: number
  name: string
  materialCode: string | null
  category: string | null
  size: string | null
  weightKg: number
}

type Plan = {
  rows: ParsedRow[]
  errors: ImportRowError[]
  toCreateRows: ParsedRow[]
  toUpdateRows: { row: ParsedRow; existingId: string }[]
  autoCodeAssignments: { rowNumber: number; code: string }[]
  newCategoryNames: string[]
  existingCategoryIdByName: Map<string, string>
  presentFields: PresentFields
}

export class CsvImportError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

function parseHeaderIndex(headerRow: string[]): {
  index: Record<string, number>
  presentFields: PresentFields
} {
  const trimmed = headerRow.map((h) => h.trim())
  const index: Record<string, number> = {}
  trimmed.forEach((h, i) => {
    if (h.length > 0) index[h] = i
  })

  for (const required of REQUIRED_HEADERS) {
    if (!(required in index)) {
      throw new CsvImportError(
        `必須ヘッダー「${required}」が見つかりません。期待ヘッダー: ${KNOWN_HEADERS.join(', ')}`,
      )
    }
  }

  const presentFields: PresentFields = {
    materialCode: CSV_HEADERS.materialCode in index,
    category: CSV_HEADERS.category in index,
    size: CSV_HEADERS.size in index,
  }
  return { index, presentFields }
}

function parseWeight(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return null
  if (!/^[0-9]+(\.[0-9]+)?$/.test(trimmed)) return null
  const num = parseFloat(trimmed)
  if (!Number.isFinite(num) || num < 0) return null
  return num
}

async function buildPlan(
  prisma: PrismaClient,
  tenantId: string,
  csvText: string,
): Promise<Plan> {
  const rows = parseCsv(csvText)
  if (rows.length === 0) {
    throw new CsvImportError('CSV が空です')
  }

  const { index: headerIndex, presentFields } = parseHeaderIndex(rows[0])
  const dataRows = rows.slice(1)

  if (dataRows.length === 0) {
    throw new CsvImportError('データ行がありません')
  }
  if (dataRows.length > MAX_ROWS) {
    throw new CsvImportError(`一度にインポートできるのは ${MAX_ROWS} 行までです（現在 ${dataRows.length} 行）`)
  }

  const errors: ImportRowError[] = []
  const parsed: ParsedRow[] = []
  const seenCodes = new Map<string, number>()

  dataRows.forEach((cells, idx) => {
    const rowNumber = idx + 2 // 1-indexed + ヘッダー行分
    const get = (header: string) => {
      const i = headerIndex[header]
      return i === undefined ? '' : (cells[i] ?? '').trim()
    }

    const name = get(CSV_HEADERS.name)
    const materialCodeRaw = get(CSV_HEADERS.materialCode)
    const category = get(CSV_HEADERS.category)
    const size = get(CSV_HEADERS.size)
    const weightRaw = get(CSV_HEADERS.weightKg)

    if (!name) {
      errors.push({ row: rowNumber, materialCode: materialCodeRaw, message: '資材名が空です' })
      return
    }
    const weight = parseWeight(weightRaw)
    if (weight === null) {
      errors.push({
        row: rowNumber,
        materialCode: materialCodeRaw,
        message: '重量(kg) は 0 以上の数値で入力してください',
      })
      return
    }

    if (materialCodeRaw) {
      const previous = seenCodes.get(materialCodeRaw)
      if (previous !== undefined) {
        errors.push({
          row: rowNumber,
          materialCode: materialCodeRaw,
          message: `同じ資材コードが ${previous} 行目と重複しています`,
        })
        return
      }
      seenCodes.set(materialCodeRaw, rowNumber)
    }

    parsed.push({
      rowNumber,
      name,
      materialCode: materialCodeRaw || null,
      category: category || null,
      size: size || null,
      weightKg: weight,
    })
  })

  const explicitCodes = parsed.filter((r) => r.materialCode).map((r) => r.materialCode!)
  const existingMaterials = explicitCodes.length
    ? await prisma.material.findMany({
        where: { tenantId, materialCode: { in: explicitCodes } },
        select: { id: true, materialCode: true },
      })
    : []
  const existingByCode = new Map(existingMaterials.map((m) => [m.materialCode, m.id]))

  const toCreateRows: ParsedRow[] = []
  const toUpdateRows: { row: ParsedRow; existingId: string }[] = []
  for (const row of parsed) {
    if (row.materialCode && existingByCode.has(row.materialCode)) {
      toUpdateRows.push({ row, existingId: existingByCode.get(row.materialCode)! })
    } else {
      toCreateRows.push(row)
    }
  }

  const autoCodeRows = toCreateRows.filter((r) => !r.materialCode)
  const autoCodeAssignments = await assignAutoCodes(prisma, tenantId, autoCodeRows)

  const distinctCategoryNames = Array.from(
    new Set(parsed.map((r) => r.category).filter((c): c is string => !!c)),
  )
  const existingCategories = distinctCategoryNames.length
    ? await prisma.category.findMany({
        where: { tenantId, name: { in: distinctCategoryNames } },
        select: { id: true, name: true },
      })
    : []
  const existingCategoryIdByName = new Map(existingCategories.map((c) => [c.name, c.id]))
  const newCategoryNames = distinctCategoryNames.filter((n) => !existingCategoryIdByName.has(n))

  return {
    rows: parsed,
    errors,
    toCreateRows,
    toUpdateRows,
    autoCodeAssignments,
    newCategoryNames,
    existingCategoryIdByName,
    presentFields,
  }
}

function skippedHeaderLabels(presentFields: PresentFields): string[] {
  const labels: string[] = []
  if (!presentFields.materialCode) labels.push(CSV_HEADERS.materialCode)
  if (!presentFields.category) labels.push(CSV_HEADERS.category)
  if (!presentFields.size) labels.push(CSV_HEADERS.size)
  return labels
}

async function assignAutoCodes(
  prisma: PrismaClient,
  tenantId: string,
  rows: ParsedRow[],
): Promise<{ rowNumber: number; code: string }[]> {
  if (rows.length === 0) return []

  const existing = await prisma.material.findMany({
    where: { tenantId, materialCode: { startsWith: AUTO_CODE_PREFIX } },
    select: { materialCode: true },
  })
  let maxSeq = 0
  for (const { materialCode } of existing) {
    const m = AUTO_CODE_PATTERN.exec(materialCode)
    if (m) {
      const seq = parseInt(m[1], 10)
      if (seq > maxSeq) maxSeq = seq
    }
  }

  return rows.map((row, idx) => {
    const seq = maxSeq + idx + 1
    return { rowNumber: row.rowNumber, code: `${AUTO_CODE_PREFIX}${String(seq).padStart(3, '0')}` }
  })
}

export async function planImport(
  prisma: PrismaClient,
  tenantId: string,
  csvText: string,
): Promise<ImportPlan> {
  const plan = await buildPlan(prisma, tenantId, csvText)

  const autoCodes = plan.autoCodeAssignments
  return {
    total: plan.rows.length + plan.errors.length,
    toCreate: plan.toCreateRows.length,
    toUpdate: plan.toUpdateRows.length,
    autoCodes: autoCodes.length,
    newCategories: plan.newCategoryNames.length,
    errors: plan.errors,
    newCategoryNames: plan.newCategoryNames,
    autoCodeRange:
      autoCodes.length === 0
        ? null
        : { from: autoCodes[0].code, to: autoCodes[autoCodes.length - 1].code },
    skippedHeaders: skippedHeaderLabels(plan.presentFields),
  }
}

export async function executeImport(
  prisma: PrismaClient,
  tenantId: string,
  csvText: string,
): Promise<ImportResult> {
  const plan = await buildPlan(prisma, tenantId, csvText)
  const autoCodeByRow = new Map(plan.autoCodeAssignments.map((a) => [a.rowNumber, a.code]))

  const result = await prisma.$transaction(
    async (tx) => {
      const categoryIdByName = new Map(plan.existingCategoryIdByName)

      if (plan.newCategoryNames.length > 0) {
        const last = await tx.category.findFirst({
          where: { tenantId },
          orderBy: { displayOrder: 'desc' },
          select: { displayOrder: true },
        })
        let nextOrder = (last?.displayOrder ?? -1) + 1
        for (const name of plan.newCategoryNames) {
          const created = await tx.category.create({
            data: { tenantId, name, displayOrder: nextOrder },
          })
          categoryIdByName.set(name, created.id)
          nextOrder++
        }
      }

      const lastMaterialOrder = await tx.material.findFirst({
        where: { tenantId },
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      })
      let nextMaterialOrder = (lastMaterialOrder?.displayOrder ?? -1) + 1

      let created = 0
      for (const row of plan.toCreateRows) {
        const code = row.materialCode ?? autoCodeByRow.get(row.rowNumber)
        if (!code) {
          throw new Error(`内部エラー: 行 ${row.rowNumber} のコードが解決できません`)
        }
        const categoryId = row.category ? (categoryIdByName.get(row.category) ?? null) : null
        await tx.material.create({
          data: {
            tenantId,
            materialCode: code,
            name: row.name,
            categoryId,
            size: row.size,
            weightKg: row.weightKg,
            displayOrder: nextMaterialOrder,
            isActive: true,
            isTemporary: false,
          },
        })
        nextMaterialOrder++
        created++
      }

      let updated = 0
      for (const { row, existingId } of plan.toUpdateRows) {
        const data: {
          name: string
          weightKg: number
          size?: string | null
          categoryId?: string | null
        } = {
          name: row.name,
          weightKg: row.weightKg,
        }
        if (plan.presentFields.category) {
          data.categoryId = row.category ? (categoryIdByName.get(row.category) ?? null) : null
        }
        if (plan.presentFields.size) {
          data.size = row.size
        }
        await tx.material.update({ where: { id: existingId }, data })
        updated++
      }

      return { created, updated }
    },
    {
      maxWait: 10_000,
      timeout: 25_000,
    },
  )

  return {
    created: result.created,
    updated: result.updated,
    autoCodesAssigned: plan.autoCodeAssignments.map((a) => ({ row: a.rowNumber, code: a.code })),
    newCategoryNames: plan.newCategoryNames,
    errors: plan.errors,
    skippedHeaders: skippedHeaderLabels(plan.presentFields),
  }
}

export function buildTemplateCsv(): string {
  const header = `${CSV_HEADERS.name},${CSV_HEADERS.materialCode},${CSV_HEADERS.category},${CSV_HEADERS.size},${CSV_HEADERS.weightKg}`
  const sample = [
    '異形鉄筋 D10,D10,鉄筋,3.5m,3.04',
    '異形鉄筋 D13,,鉄筋,3.5m,5.04',
    '軽量足場,,,,12.5',
  ]
  return '﻿' + [header, ...sample].join('\r\n') + '\r\n'
}
