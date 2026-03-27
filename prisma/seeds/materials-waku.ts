import { PrismaClient } from '@prisma/client'

export async function seedWakuMaterials(prisma: PrismaClient, tenantId: string) {
  console.log('🔨 枠カテゴリの資材を投入中...')

  // 枠カテゴリを取得
  const wakuCategory = await prisma.category.findFirst({
    where: { tenantId, name: '枠' }
  })

  if (!wakuCategory) {
    throw new Error('枠カテゴリが見つかりません')
  }

  const wakuMaterials = [
    { materialCode: 'WK-001', name: '枠　1200', size: '1200',weightKg: 15.6 },
    { materialCode: 'WK-002', name: '枠　1200　ロングピン', size: '1200', weightKg: 16.0 },
    { materialCode: 'WK-003', name: '枠　900', size: '900',weightKg: 14.6 },
    { materialCode: 'WK-004', name: '枠　900　ロングピン', size: '900', weightKg: 15.0 },
    { materialCode: 'WK-005', name: '枠　600', size: '600',weightKg: 12.6 },
    { materialCode: 'WK-006', name: '枠　600　ロングピン', size: '600', weightKg: 13.0 },
    { materialCode: 'WK-007', name: '階段', size: null,weightKg: 20.0 },
    { materialCode: 'WK-008', name: '階段　ロングピン', size: null, weightKg: 20.9 },
    { materialCode: 'WK-009', name: '階段開口部', size: null, weightKg: 13.5 },
    { materialCode: 'WK-010', name: '階段手摺', size: null, weightKg: 4.0 },
    { materialCode: 'WK-011', name: 'ジャッキベース', size: null,weightKg: 3.7 },
    { materialCode: 'WK-012', name: 'ロングジャッキベース', size: null, weightKg: 5.0 },
    { materialCode: 'WK-013', name: '筋違　L1829H1700　　A-14', size: '1829x1700', weightKg: 4.2 },
    { materialCode: 'WK-014', name: '筋違　L1524H1700　　A-11', size: '1524x1700', weightKg: 3.7 },
    { materialCode: 'WK-015', name: '筋違　L1219H1700　　A-13', size: '1219x1700', weightKg: 3.3 },
    { materialCode: 'WK-016', name: '筋違　L914H1700　　A-012', size: '914x1700', weightKg: 2.9 },
    { materialCode: 'WK-017', name: '筋違　L610H1700　　A-12', size: '610x1700', weightKg: 2.6 },
    { materialCode: 'WK-018', name: '筋違　L1829H1219　　A-19', size: '1829x1219', weightKg: 3.9 },
    { materialCode: 'WK-019', name: '筋違　L1524H1219　　A-18', size: '1524x1219', weightKg: 3.4 },
    { materialCode: 'WK-020', name: '筋違　L1219H1219　　A-012', size: '1219x1219', weightKg: 2.9 },
    { materialCode: 'WK-021', name: '筋違　L914H1219　　A-07', size: '914x1219', weightKg: 2.4 },
    { materialCode: 'WK-022', name: '筋違　L610H1219　　A-09', size: '610x1219', weightKg: 2.1 },
    { materialCode: 'WK-023', name: '筋違　L1829H914　　A-08', size: '1829x914', weightKg: 3.7 },
    { materialCode: 'WK-024', name: '筋違　L1524H914　　A-9', size: '1524x914', weightKg: 3.1 },
    { materialCode: 'WK-025', name: '筋違　L1219H914　　A-12', size: '1219x914', weightKg: 2.6 },
    { materialCode: 'WK-026', name: '筋違　L914H914　　A-09', size: '914x914', weightKg: 2.1 },
    { materialCode: 'WK-027', name: '筋違　L610H914　　A-06', size: '610x914', weightKg: 1.7 },
    { materialCode: 'WK-028', name: '筋違　L1829H914　　A-08', size: '1829x914', weightKg: 3.7 },
    { materialCode: 'WK-029', name: '筋違　L1524H914　　A-9', size: '1524x914', weightKg: 3.1 },
    { materialCode: 'WK-030', name: '筋違　L1219H914　　A-12', size: '1219x914', weightKg: 2.6 },
    { materialCode: 'WK-031', name: '筋違　L914H914　　A-09', size: '914x914', weightKg: 2.1 },
    { materialCode: 'WK-032', name: '筋違　L610H914　　A-06', size: '610x914', weightKg: 1.7 },
    { materialCode: 'WK-033', name: '筋違　L1829H490　　A-16S', size: '1829x490', weightKg: 3.5 },
    { materialCode: 'WK-034', name: '筋違　L1524H490　　A-16', size: '1524x490', weightKg: 3.0 },
    { materialCode: 'WK-035', name: '筋違　L1219H490　　A-05', size: '1219x490', weightKg: 2.5 },
    { materialCode: 'WK-036', name: '筋違　L914H490　　A-04', size: '914x490', weightKg: 1.9 },
    { materialCode: 'WK-037', name: '筋違　L610H490　　A-03', size: '610x490', weightKg: 1.4 },
    { materialCode: 'WK-038', name: '調整枠　H1524×W1219', size: '1524x1219', weightKg: 15.0 },
    { materialCode: 'WK-039', name: '調整枠　H1219×W1219', size: '1219x1219', weightKg: 13.0 },
    { materialCode: 'WK-040', name: '調整枠　H914×W1219', size: '914x1219', weightKg: 11.0 },
    { materialCode: 'WK-041', name: '調整枠　H490×W1219', size: '490x1219', weightKg: 9.1 },
    { materialCode: 'WK-042', name: '調整枠　H1524×W914', size: '1524x914', weightKg: 13.2 },
    { materialCode: 'WK-043', name: '調整枠　H1219×W914', size: '1219x914', weightKg: 11.0 },
    { materialCode: 'WK-044', name: '調整枠　H914×W914', size: '914x914', weightKg: 9.2 },
    { materialCode: 'WK-045', name: '調整枠　H490×W914', size: '490x914', weightKg: 8.2 },
    { materialCode: 'WK-046', name: '調整枠　H1524×W610', size: '1524x610', weightKg: 10.5 },
    { materialCode: 'WK-047', name: '調整枠　H1219×W610', size: '1219x610', weightKg: 10.2 },
    { materialCode: 'WK-048', name: '調整枠　H914×W610', size: '914x610', weightKg: 8.2 },
    { materialCode: 'WK-049', name: '調整枠　H490×W610', size: '490x610', weightKg: 7.2 },
    { materialCode: 'WK-050', name: '布板（500）　1800', size: '1800', weightKg: 14.3 },
    { materialCode: 'WK-051', name: '布板（500）　1500', size: '1500', weightKg: 11.9 },
    { materialCode: 'WK-052', name: '布板（500）　1200', size: '1200', weightKg: 10.3 },
    { materialCode: 'WK-053', name: '布板（500）　900', size: '900', weightKg: 7.8 },
    { materialCode: 'WK-054', name: '布板（500）　600', size: '600', weightKg: 5.3 },
    { materialCode: 'WK-055', name: '布板（240）　1800', size: '1800', weightKg: 10.2 },
    { materialCode: 'WK-056', name: '布板（240）　1500', size: '1500', weightKg: 6.7 },
    { materialCode: 'WK-057', name: '布板（240）　1200', size: '1200', weightKg: 6.0 },
    { materialCode: 'WK-058', name: '布板（240）　900', size: '900', weightKg: 4.6 },
    { materialCode: 'WK-059', name: '布板（240）　600', size: '600', weightKg: 3.8 },
    { materialCode: 'WK-060', name: 'エンドストッパー', size: null,weightKg: 2.5 },
    { materialCode: 'WK-061', name: '連結ピン', size: null,weightKg: 0.6 },
    { materialCode: 'WK-062', name: '手摺柱', size: null, weightKg: 2.4 },
    { materialCode: 'WK-063', name: '伸縮ブラケット　350-500', size: '350-500', weightKg: 4.0 },
    { materialCode: 'WK-064', name: '伸縮ブラケット　500-750', size: '500-750', weightKg: 4.6 },
    { materialCode: 'WK-065', name: '伸縮ブラケット　750-1100', size: '750-1100', weightKg: 5.8 },
    { materialCode: 'WK-066', name: 'ホリーブラケット　500', size: '500', weightKg: 2.3 },
    { materialCode: 'WK-067', name: 'ホリーブラケット　600', size: '600', weightKg: 2.6 },
    { materialCode: 'WK-068', name: '下さん　1800', size: '1800', weightKg: 1.8 },
    { materialCode: 'WK-069', name: '下さん　1500', size: '1500', weightKg: 1.5 },
    { materialCode: 'WK-070', name: '下さん　1200', size: '1200', weightKg: 1.2 },
    { materialCode: 'WK-071', name: '下さん　900', size: '900', weightKg: 0.9 },
    { materialCode: 'WK-072', name: '梁枠２スパン', size: '2スパン', weightKg: 28.3 },
    { materialCode: 'WK-073', name: '梁枠３スパン', size: '3スパン', weightKg: 38.8 },
    { materialCode: 'WK-074', name: '梁渡し914', size: '914', weightKg: 5.4 },
    { materialCode: 'WK-075', name: '梁渡し1219', size: '1219', weightKg: 8.8 },
    { materialCode: 'WK-076', name: '方杖3スパン', size: '3スパン', weightKg: 6.2 },
    { materialCode: 'WK-077', name: '方杖2スパン', size: '2スパン', weightKg: 4.8 },
    { materialCode: 'WK-078', name: '隅梁受', size: null, weightKg: 2.8 },
    { materialCode: 'WK-079', name: 'コーナーステップ　500', size: '500', weightKg: 6.6 },
    { materialCode: 'WK-080', name: 'コーナーステップ　240', size: '240', weightKg: 3.4 },
    { materialCode: 'WK-081', name: 'コンビステップ　600', size: '600', weightKg: 5.7 },
    { materialCode: 'WK-082', name: 'コンビステップ　900', size: '900', weightKg: 4.4 },
    { materialCode: 'WK-083', name: '手摺先行（据置き）　1800', size: '1800', weightKg: 13.0 },
    { materialCode: 'WK-084', name: '手摺先行（据置き）　1500', size: '1500', weightKg: 12.2 },
    { materialCode: 'WK-085', name: '手摺先行（据置き）　1200', size: '1200', weightKg: 10.4 },
    { materialCode: 'WK-086', name: '手摺先行（据置き）　900', size: '900', weightKg: 9.4 },
    { materialCode: 'WK-087', name: '手摺先行（据置き）　600', size: '600', weightKg: 7.6 },
    { materialCode: 'WK-088', name: '手摺先行（ネチス）　1800', size: '1800', weightKg: 10.0 },
    { materialCode: 'WK-089', name: '手摺先行（ネチス）　1500', size: '1500', weightKg: 9.0 },
    { materialCode: 'WK-090', name: '手摺先行（ネチス）　1200', size: '1200', weightKg: 8.0 },
    { materialCode: 'WK-091', name: '手摺先行（ネチス）　900', size: '900', weightKg: 6.3 },
    { materialCode: 'WK-092', name: '手摺先行（ネチス）　600', size: '600', weightKg: 5.5 },
    { materialCode: 'WK-093', name: '手摺先行（先送り）　1800', size: '1800', weightKg: 8.1 },
    { materialCode: 'WK-094', name: '手摺先行（先送り）　1500', size: '1500', weightKg: 7.4 },
    { materialCode: 'WK-095', name: '手摺先行（先送り）　1200', size: '1200', weightKg: 6.7 },
    { materialCode: 'WK-096', name: '手摺先行（先送り）　900', size: '900', weightKg: 6.0 },
  ]

  let successCount = 0
  for (const material of wakuMaterials) {
    try {
      await prisma.material.upsert({
        where: {
          tenantId_materialCode: { tenantId, materialCode: material.materialCode }
        },
        update: {
          name: material.name,
          categoryId: wakuCategory.id,
          size: material.size,
          weightKg: material.weightKg
        },
        create: {
          tenantId,
          ...material,
          categoryId: wakuCategory.id
        }
      })
      successCount++
    } catch (error) {
      console.log(`  ⚠️ スキップ: ${material.materialCode}`)
    }
  }

  console.log(`🔨 枠カテゴリ: ${successCount}件の資材投入完了\n`)
}
