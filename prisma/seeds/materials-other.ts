import { PrismaClient } from '@prisma/client'

export async function seedOtherMaterials(prisma: PrismaClient, tenantId: string) {
  console.log('🔧 その他カテゴリの資材を投入中...')

  const otherCategory = await prisma.category.findFirst({
    where: { tenantId, name: 'その他' }
  })

  if (!otherCategory) {
    throw new Error('その他カテゴリが見つかりません')
  }

  const otherMaterials = [
    { materialCode: 'OT-001', name: 'パイプ　6.0m', size: '6.0m', type: 'パイプ', weightKg: 12.48 },
    { materialCode: 'OT-002', name: 'パイプ　5.0m', size: '5.0m', type: 'パイプ', weightKg: 10.40 },
    { materialCode: 'OT-003', name: 'パイプ　4.5m', size: '4.5m', type: 'パイプ', weightKg: 9.36 },
    { materialCode: 'OT-004', name: 'パイプ　4.0m', size: '4.0m', type: 'パイプ', weightKg: 8.32 },
    { materialCode: 'OT-005', name: 'パイプ　3.5m', size: '3.5m', type: 'パイプ', weightKg: 7.28 },
    { materialCode: 'OT-006', name: 'パイプ　3.0m', size: '3.0m', type: 'パイプ', weightKg: 6.24 },
    { materialCode: 'OT-007', name: 'パイプ　2.5m', size: '2.5m', type: 'パイプ', weightKg: 5.20 },
    { materialCode: 'OT-008', name: 'パイプ　2.0m', size: '2.0m', type: 'パイプ', weightKg: 4.16 },
    { materialCode: 'OT-009', name: 'パイプ　1.5m', size: '1.5m', type: 'パイプ', weightKg: 3.12 },
    { materialCode: 'OT-010', name: 'パイプ　1.0m', size: '1.0m', type: 'パイプ', weightKg: 2.08 },
    { materialCode: 'OT-011', name: 'パイプ　0.5m', size: '0.5m', type: 'パイプ', weightKg: 1.04 },
    { materialCode: 'OT-012', name: '杭　1.0m', size: '1.0m', type: '杭', weightKg: 2.73 },
    { materialCode: 'OT-013', name: '杭　1.5m', size: '1.5m', type: '杭', weightKg: 4.10 },
    { materialCode: 'OT-014', name: 'クランプ直交', size: null, type: 'クランプ', weightKg: 0.70 },
    { materialCode: 'OT-015', name: 'クランプ自在', size: null, type: 'クランプ', weightKg: 0.73 },
    { materialCode: 'OT-016', name: 'キャッチクランプ直交', size: null, type: 'クランプ', weightKg: 1.80 },
    { materialCode: 'OT-017', name: 'キャッチクランプ自在', size: null, type: 'クランプ', weightKg: 1.80 },
    { materialCode: 'OT-018', name: 'サポートクランプ直交', size: null, type: 'クランプ', weightKg: 0.70 },
    { materialCode: 'OT-019', name: 'サポートクランプ自在', size: null, type: 'クランプ', weightKg: 0.70 },
    { materialCode: 'OT-020', name: '単クランプ', size: null, type: 'クランプ', weightKg: 0.42 },
    { materialCode: 'OT-021', name: 'ジョイント', size: null, type: 'ジョイント', weightKg: 0.70 },
    { materialCode: 'OT-022', name: '単管ベース（固定）', size: null, type: 'ベース', weightKg: 0.80 },
    { materialCode: 'OT-023', name: '単管ベース（自在）', size: null, type: 'ベース', weightKg: 1.42 },
    { materialCode: 'OT-024', name: '木製足場板　4.0m', size: '4.0m', type: '足場板', weightKg: 16.00 },
    { materialCode: 'OT-025', name: '木製足場板　2.0m', size: '2.0m', type: '足場板', weightKg: 8.00 },
    { materialCode: 'OT-026', name: '敷板　4.0m', size: '4.0m', type: '敷板', weightKg: 16.00 },
    { materialCode: 'OT-027', name: '敷板　2.0m', size: '2.0m', type: '敷板', weightKg: 8.00 },
    { materialCode: 'OT-028', name: '単独板', size: null, type: '敷板', weightKg: 0.50 },
    { materialCode: 'OT-029', name: '巾木　4m', size: '4m', type: '巾木', weightKg: 6.00 },
    { materialCode: 'OT-030', name: '巾木　2m', size: '2m', type: '巾木', weightKg: 3.00 },
    { materialCode: 'OT-031', name: '巾木クランプ', size: null, type: '巾木', weightKg: 0.50 },
    { materialCode: 'OT-032', name: '鋼製巾木　４ｍ', size: '4m', type: '巾木', weightKg: 13.90 },
    { materialCode: 'OT-033', name: '鋼製巾木　２ｍ', size: '2m', type: '巾木', weightKg: 7.20 },
    { materialCode: 'OT-034', name: 'ローリングキャスター', size: null, type: 'キャスター', weightKg: 7.40 },
    { materialCode: 'OT-035', name: 'フラットパネル　H2.0ｍ', size: 'H2.0m', type: 'フラットパネル', weightKg: 12.40 },
    { materialCode: 'OT-036', name: 'フラットパネル　H2.0ｍ　パンチング', size: 'H2.0m', type: 'フラットパネル', weightKg: 12.40 },
    { materialCode: 'OT-037', name: 'フラットパネル　H3.0ｍ', size: 'H3.0m', type: 'フラットパネル', weightKg: 18.60 },
    { materialCode: 'OT-038', name: 'フラットパネル　H3.0ｍ　パンチング', size: 'H3.0m', type: 'フラットパネル', weightKg: 18.60 },
    { materialCode: 'OT-039', name: 'フラットパネル　H2.0ｍ　調整', size: 'H2.0m調整', type: 'フラットパネル', weightKg: 11.30 },
    { materialCode: 'OT-040', name: 'フラットパネル　H3.0ｍ　調整', size: 'H3.0m調整', type: 'フラットパネル', weightKg: 17.00 },
    { materialCode: 'OT-041', name: 'フラットパネル　H2.0ｍ　コーナー', size: 'H2.0mコーナー', type: 'フラットパネル', weightKg: 12.60 },
    { materialCode: 'OT-042', name: 'フラットパネル　H3.0ｍ　コーナー', size: 'H3.0mコーナー', type: 'フラットパネル', weightKg: 18.90 },
    { materialCode: 'OT-043', name: 'ウィンドウパネル　H2.0ｍ', size: 'H2.0m', type: 'フラットパネル', weightKg: 22.00 },
    { materialCode: 'OT-044', name: 'ウィンドウパネル　H3.0ｍ', size: 'H3.0m', type: 'フラットパネル', weightKg: 28.20 },
    { materialCode: 'OT-045', name: 'フラットパネル取付金具', size: null, type: 'フラットパネル', weightKg: 0.10 },
    { materialCode: 'OT-046', name: '仮設ドア　Ｗ1.0ｍ　Ｈ2.0ｍ', size: 'W1.0m×H2.0m', type: '仮設ドア', weightKg: 42.00 },
    { materialCode: 'OT-047', name: '仮設ドア　Ｗ0.5ｍ　Ｈ2.0ｍ', size: 'W0.5m×H2.0m', type: '仮設ドア', weightKg: 22.00 },
    { materialCode: 'OT-048', name: 'フラットパネル　Ｈ1.0ｍ調整用', size: 'H1.0m調整', type: 'フラットパネル', weightKg: 6.20 },
    { materialCode: 'OT-049', name: 'フラットパネル取付金具', size: null, type: 'フラットパネル', weightKg: 0.10 },
    { materialCode: 'OT-050', name: '壁つなぎ　13-16', size: '13-16', type: '壁つなぎ', weightKg: 0.60 },
    { materialCode: 'OT-051', name: '壁つなぎ　16-20', size: '16-20', type: '壁つなぎ', weightKg: 0.80 },
    { materialCode: 'OT-052', name: '壁つなぎ　19-25', size: '19-25', type: '壁つなぎ', weightKg: 1.00 },
    { materialCode: 'OT-053', name: '壁つなぎ　24-34', size: '24-34', type: '壁つなぎ', weightKg: 1.10 },
    { materialCode: 'OT-054', name: '壁つなぎ　34-52', size: '34-52', type: '壁つなぎ', weightKg: 1.70 },
    { materialCode: 'OT-055', name: '壁つなぎ　50-72', size: '50-72', type: '壁つなぎ', weightKg: 1.90 },
    { materialCode: 'OT-056', name: '壁つなぎ　70-92', size: '70-92', type: '壁つなぎ', weightKg: 2.20 },
    { materialCode: 'OT-057', name: '壁つなぎ　90-112', size: '90-112', type: '壁つなぎ', weightKg: 2.70 },
    { materialCode: 'OT-058', name: '壁つなぎ(二段)　250-420', size: '250-420', type: '壁つなぎ二段', weightKg: 1.20 },
    { materialCode: 'OT-059', name: '壁つなぎ(二段)　380-760', size: '380-760', type: '壁つなぎ二段', weightKg: 1.60 },
    { materialCode: 'OT-060', name: '壁つなぎ(二段)　680-1060', size: '680-1060', type: '壁つなぎ二段', weightKg: 2.20 },
    { materialCode: 'OT-061', name: '釘', size: null, type: '小物', weightKg: 0.00 },
    { materialCode: 'OT-062', name: '大ハンマー', size: null, type: '工具', weightKg: 3.50 },
    { materialCode: 'OT-063', name: 'L型巾木　1.8　メーター', size: '1.8m', type: 'L型巾木', weightKg: 4.50 },
    { materialCode: 'OT-064', name: 'L型巾木　1.5　メーター', size: '1.5m', type: 'L型巾木', weightKg: 3.80 },
    { materialCode: 'OT-065', name: 'L型巾木　1.2　メーター', size: '1.2m', type: 'L型巾木', weightKg: 3.20 },
    { materialCode: 'OT-066', name: 'L型巾木　0.9　メーター', size: '0.9m', type: 'L型巾木', weightKg: 2.50 },
    { materialCode: 'OT-067', name: 'L型巾木　0.6　メーター', size: '0.6m', type: 'L型巾木', weightKg: 1.80 },
    { materialCode: 'OT-068', name: 'L型巾木　妻側　1.2　メーター', size: '妻側1.2m', type: 'L型巾木', weightKg: 2.50 },
    { materialCode: 'OT-069', name: 'L型巾木　妻側　0.9　メーター', size: '妻側0.9m', type: 'L型巾木', weightKg: 2.00 },
    { materialCode: 'OT-070', name: 'L型巾木　妻側　0.6　メーター', size: '妻側0.6m', type: 'L型巾木', weightKg: 1.25 },
    { materialCode: 'OT-071', name: '養生枠　1800×900', size: '1800×900', type: '養生枠', weightKg: 9.40 },
    { materialCode: 'OT-072', name: '養生枠　1500×900', size: '1500×900', type: '養生枠', weightKg: 8.80 },
    { materialCode: 'OT-073', name: '養生枠　1200×900', size: '1200×900', type: '養生枠', weightKg: 7.40 },
    { materialCode: 'OT-074', name: '養生枠　900×900', size: '900×900', type: '養生枠', weightKg: 6.50 },
    { materialCode: 'OT-075', name: '養生枠　600×900', size: '600×900', type: '養生枠', weightKg: 3.70 },
    { materialCode: 'OT-076', name: '養生クランプ', size: null, type: '養生枠', weightKg: 0.34 },
    { materialCode: 'OT-077', name: 'バンセン　10番', size: '10番', type: 'バンセン', weightKg: 0.00 },
    { materialCode: 'OT-078', name: 'バンセン　12番', size: '12番', type: 'バンセン', weightKg: 0.00 },
    { materialCode: 'OT-079', name: '朝顔　1800', size: '1800', type: '朝顔', weightKg: 31.20 },
    { materialCode: 'OT-080', name: '朝顔　1500', size: '1500', type: '朝顔', weightKg: 30.1 },
    { materialCode: 'OT-081', name: '朝顔　1200', size: '1200', type: '朝顔', weightKg: 28.9 },
    { materialCode: 'OT-082', name: '朝顔　900', size: '900', type: '朝顔', weightKg: 27.6 },
    { materialCode: 'OT-083', name: '朝顔　600', size: '600', type: '朝顔', weightKg: 26.3 },
    { materialCode: 'OT-084', name: '朝顔　コーナー用', size: null, type: '朝顔', weightKg: 32.1 },
    { materialCode: 'OT-085', name: '定尺棒　1800', size: '1800', type: '定尺棒', weightKg: 3.2 },
    { materialCode: 'OT-086', name: '定尺棒　1500', size: '1500', type: '定尺棒', weightKg: 2.7 },
    { materialCode: 'OT-087', name: '定尺棒　1200', size: '1200', type: '定尺棒', weightKg: 2.3 },
    { materialCode: 'OT-088', name: '定尺棒　900', size: '900', type: '定尺棒', weightKg: 1.8 },
  ]

  let successCount = 0
  for (const material of otherMaterials) {
    try {
      await prisma.material.upsert({
        where: {
          tenantId_materialCode: { tenantId, materialCode: material.materialCode }
        },
        update: {
          name: material.name,
          categoryId: otherCategory.id,
          size: material.size,
          type: material.type,
          weightKg: material.weightKg
        },
        create: {
          tenantId,
          ...material,
          categoryId: otherCategory.id
        }
      })
      successCount++
    } catch (error) {
      console.log(`  ⚠️ スキップ: ${material.materialCode}`)
    }
  }

  console.log(`🔧 その他カテゴリ: ${successCount}件の資材投入完了\n`)
}
