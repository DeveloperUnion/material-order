'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTenantPath } from '@/lib/tenant/links';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Plus,
  Check,
  Package,
  Pencil,
  Trash2,
  X,
  GripVertical,
  ChevronRight,
  ArrowDownAZ,
  ArrowUpAZ,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Category {
  id: string;
  name: string;
  displayOrder: number;
}

interface Material {
  id: string;
  materialCode: string;
  name: string;
  size: string | null;
  weightKg: number;
  displayOrder: number;
  isActive: boolean;
  isTemporary: boolean;
  category: Category | null;
  categoryId: string | null;
}

const UNCATEGORIZED_LABEL = '未分類';
const UNCATEGORIZED_KEY = '__uncategorized__';
const GROUP_KEY_SEP = '::';

const naturalCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

const sortMaterials = (list: Material[]): Material[] =>
  [...list].sort((x, y) => {
    const cx = x.category?.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const cy = y.category?.displayOrder ?? Number.MAX_SAFE_INTEGER;
    if (cx !== cy) return cx - cy;
    if (x.displayOrder !== y.displayOrder) return x.displayOrder - y.displayOrder;
    return x.materialCode.localeCompare(y.materialCode);
  });

const makeGroupKey = (categoryId: string | null, name: string): string =>
  `${categoryId ?? UNCATEGORIZED_KEY}${GROUP_KEY_SEP}${name}`;

const parseGroupKey = (
  key: string,
): { categoryId: string | null; name: string } | null => {
  const idx = key.indexOf(GROUP_KEY_SEP);
  if (idx < 0) return null;
  const catPart = key.slice(0, idx);
  const namePart = key.slice(idx + GROUP_KEY_SEP.length);
  return {
    categoryId: catPart === UNCATEGORIZED_KEY ? null : catPart,
    name: namePart,
  };
};

interface MaterialGroup {
  key: string;
  name: string;
  categoryId: string | null;
  items: Material[];
}

// 同名資材を 1 グループに集約。グループの並び順は先頭出現順（=displayOrder 順で来た配列の出現順）。
const buildGroups = (items: Material[]): MaterialGroup[] => {
  const map = new Map<string, MaterialGroup>();
  for (const m of items) {
    const key = makeGroupKey(m.categoryId, m.name);
    let g = map.get(key);
    if (!g) {
      g = { key, name: m.name, categoryId: m.categoryId, items: [] };
      map.set(key, g);
    }
    g.items.push(m);
  }
  return Array.from(map.values());
};

export default function MaterialsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const t = useTenantPath();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    materialCode: '',
    size: '',
    weightKg: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  const usesCategories = categories.length > 0;

  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // グループごとの開閉状態とサイズ並び順 (asc/desc)。永続化はしない
  const [openByGroup, setOpenByGroup] = useState<Record<string, boolean>>({});
  const [sortDirByGroup, setSortDirByGroup] = useState<Record<string, 'asc' | 'desc'>>({});

  const toggleOpen = useCallback((groupKey: string) => {
    setOpenByGroup((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  }, []);

  // トグルクリック時にグループ内 size 並びを反転させ、displayOrder を再採番して保存する。
  // member の displayOrder スロット（既存の値の集合）を保持したまま、ナチュラルソート結果を割り当て直す。
  // 他グループ・他カテゴリの並びには影響しない。
  const toggleSort = (groupKey: string) => {
    const parsed = parseGroupKey(groupKey);
    if (!parsed) return;
    const groupMembers = materials.filter(
      (m) => m.categoryId === parsed.categoryId && m.name === parsed.name,
    );
    if (groupMembers.length < 2) return;

    const currentDir = sortDirByGroup[groupKey] ?? 'desc';
    const newDir: 'asc' | 'desc' = currentDir === 'asc' ? 'desc' : 'asc';

    const slots = groupMembers.map((m) => m.displayOrder).sort((a, b) => a - b);
    const sortedMembers = [...groupMembers].sort((a, b) => {
      const ka = a.size ?? a.materialCode;
      const kb = b.size ?? b.materialCode;
      const cmp = naturalCollator.compare(ka, kb);
      return newDir === 'asc' ? cmp : -cmp;
    });

    const affected = new Map<string, { displayOrder: number; categoryId: string | null }>();
    sortedMembers.forEach((m, i) => {
      const slot = slots[i];
      if (m.displayOrder !== slot) {
        affected.set(m.id, { displayOrder: slot, categoryId: m.categoryId });
      }
    });

    const dirSnapshot = sortDirByGroup;
    setSortDirByGroup((prev) => ({ ...prev, [groupKey]: newDir }));

    if (affected.size === 0) return; // 既に目的の並びになっている場合は state 反転のみ

    const next = materials.map((m) => {
      const upd = affected.get(m.id);
      return upd ? { ...m, displayOrder: upd.displayOrder } : m;
    });
    void persistReorder(sortMaterials(next), affected, () => {
      setSortDirByGroup(dirSnapshot);
    });
  };

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [materialsRes, categoriesRes] = await Promise.all([
        fetch('/api/materials'),
        fetch('/api/categories'),
      ]);

      if (materialsRes.status === 401 || categoriesRes.status === 401) {
        router.push(t('/'));
        return;
      }

      if (!materialsRes.ok || !categoriesRes.ok) {
        throw new Error('データの取得に失敗しました');
      }

      const materialsData = await materialsRes.json();
      const categoriesData = await categoriesRes.json();

      setMaterials(materialsData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    if (session && session.user?.role !== 'ADMIN') {
      router.push(t('/dashboard'));
      return;
    }
    fetchData();
  }, [session, router, t, fetchData]);

  const resetForm = () => {
    setFormData({ name: '', categoryId: '', materialCode: '', size: '', weightKg: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (material: Material) => {
    setFormData({
      name: material.name,
      categoryId: material.categoryId ?? '',
      materialCode: material.materialCode,
      size: material.size || '',
      weightKg: String(material.weightKg),
    });
    setEditingId(material.id);
    setShowForm(true);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingId) {
        const res = await fetch(`/api/materials/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            categoryId: formData.categoryId,
            size: formData.size,
            weightKg: formData.weightKg,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '更新に失敗しました');

        setMaterials(materials.map((m) => (m.id === editingId ? data.material : m)));
        setSuccess('資材を更新しました');
      } else {
        const res = await fetch('/api/materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '作成に失敗しました');

        setMaterials([...materials, data]);
        setSuccess('資材を追加しました');
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (material: Material) => {
    setSelectedMaterial(material);
    setDeleteDialogOpen(true);
  };

  // DnD: 並び替え
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const persistReorder = async (
    next: Material[],
    affected: Map<string, { displayOrder: number; categoryId: string | null }>,
    onRollback?: () => void,
  ) => {
    const snapshot = materials;
    setMaterials(next);
    setError(null);

    try {
      const updates = Array.from(affected.entries()).map(([id, v]) => ({
        id,
        displayOrder: v.displayOrder,
        categoryId: v.categoryId,
      }));
      const res = await fetch('/api/materials/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '並び替えに失敗しました');
      }
    } catch (err) {
      setMaterials(snapshot);
      onRollback?.();
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeKey = String(active.id);
    const overKey = String(over.id);
    const activeParsed = parseGroupKey(activeKey);
    const overParsed = parseGroupKey(overKey);
    if (!activeParsed || !overParsed) return;

    const sourceCatId = activeParsed.categoryId;
    const targetCatId = overParsed.categoryId;

    const sourceCatMaterials = sortMaterials(
      materials.filter((m) => m.categoryId === sourceCatId),
    );
    const sourceGroups = buildGroups(sourceCatMaterials);
    const movedGroup = sourceGroups.find((g) => g.key === activeKey);
    if (!movedGroup) return;

    const affected = new Map<string, { displayOrder: number; categoryId: string | null }>();

    if (sourceCatId === targetCatId) {
      // 同一カテゴリ内: グループ単位で arrayMove → flat 展開して 0..N-1 で再採番
      const fromIdx = sourceGroups.findIndex((g) => g.key === activeKey);
      const toIdx = sourceGroups.findIndex((g) => g.key === overKey);
      if (fromIdx === -1 || toIdx === -1) return;
      const reordered = arrayMove(sourceGroups, fromIdx, toIdx);
      const flat = reordered.flatMap((g) => g.items);
      flat.forEach((m, idx) => {
        if (m.displayOrder !== idx) {
          affected.set(m.id, { displayOrder: idx, categoryId: m.categoryId });
        }
      });
      if (affected.size === 0) return;

      const next = materials.map((m) => {
        const upd = affected.get(m.id);
        return upd ? { ...m, displayOrder: upd.displayOrder } : m;
      });
      void persistReorder(sortMaterials(next), affected);
      return;
    }

    // 別カテゴリへ: 移動グループの全 size を新カテゴリへ。元/先の両方を 0..N-1 で再採番
    const targetCatMaterials = sortMaterials(
      materials.filter((m) => m.categoryId === targetCatId),
    );
    const targetGroups = buildGroups(targetCatMaterials);
    const insertIdx = targetGroups.findIndex((g) => g.key === overKey);
    if (insertIdx === -1) return;

    const newTargetCategory =
      targetCatId === null
        ? null
        : categories.find((c) => c.id === targetCatId) ?? null;
    const movedItems: Material[] = movedGroup.items.map((m) => ({
      ...m,
      categoryId: targetCatId,
      category: newTargetCategory,
    }));
    const movedItemIds = new Set(movedItems.map((m) => m.id));

    const remainingSourceGroups = sourceGroups.filter((g) => g.key !== activeKey);
    const sourceFlat = remainingSourceGroups.flatMap((g) => g.items);
    sourceFlat.forEach((m, idx) => {
      if (m.displayOrder !== idx) {
        affected.set(m.id, { displayOrder: idx, categoryId: m.categoryId });
      }
    });

    const newTargetFlat = [
      ...targetGroups.slice(0, insertIdx).flatMap((g) => g.items),
      ...movedItems,
      ...targetGroups.slice(insertIdx).flatMap((g) => g.items),
    ];
    newTargetFlat.forEach((m, idx) => {
      const wasMoved = movedItemIds.has(m.id);
      if (wasMoved || m.displayOrder !== idx) {
        affected.set(m.id, { displayOrder: idx, categoryId: m.categoryId });
      }
    });

    if (affected.size === 0) return;

    const movedById = new Map(movedItems.map((m) => [m.id, m]));
    const next = materials.map((m) => {
      const moved = movedById.get(m.id);
      if (moved) {
        const upd = affected.get(m.id);
        return upd ? { ...moved, displayOrder: upd.displayOrder } : moved;
      }
      const upd = affected.get(m.id);
      return upd ? { ...m, displayOrder: upd.displayOrder } : m;
    });
    void persistReorder(sortMaterials(next), affected);
  };

  const confirmDelete = async () => {
    if (!selectedMaterial) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/materials/${selectedMaterial.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '削除に失敗しました');
      }
      setMaterials(materials.filter((m) => m.id !== selectedMaterial.id));
      setSuccess(`「${selectedMaterial.name}」を削除しました`);
      setDeleteDialogOpen(false);
      setSelectedMaterial(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredMaterials =
    filterCategory === 'all'
      ? materials
      : filterCategory === 'uncategorized'
      ? materials.filter((m) => m.categoryId === null)
      : materials.filter((m) => m.categoryId === filterCategory);

  const groupedMaterials = filteredMaterials.reduce<Record<string, Material[]>>((acc, m) => {
    const catName = m.category?.name ?? UNCATEGORIZED_LABEL;
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(m);
    return acc;
  }, {});

  const uncategorizedCount = materials.filter((m) => m.categoryId === null).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-9 w-9 border-2 border-border border-t-accent mx-auto" />
          <p className="mt-4 text-sm text-muted">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(t('/dashboard'))}
              className="flex items-center gap-1 px-2 py-1.5 -ml-2 text-sm text-muted hover:text-foreground hover:bg-surface-muted rounded-md transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              戻る
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              資材管理
            </h1>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
              setSuccess(null);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-md transition-colors"
          >
            <Plus className="h-4 w-4" />
            資材追加
          </button>
        </div>

        {/* メッセージ */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
            <Check className="h-4 w-4" />
            {success}
          </div>
        )}

        {/* 追加/編集フォーム */}
        {showForm && (
          <div className="bg-surface rounded-xl border border-border p-5 sm:p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-foreground tracking-tight">
                {editingId ? '資材を編集' : '新規資材を追加'}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="p-1 rounded-md hover:bg-surface-muted transition-colors"
                aria-label="閉じる"
              >
                <X className="h-4 w-4 text-muted" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    資材名 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm text-foreground border border-border rounded-md bg-surface focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none transition-all"
                  />
                </div>
                {!editingId && (
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">
                      品番 <span className="text-subtle">(任意)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.materialCode}
                      onChange={(e) => setFormData({ ...formData, materialCode: e.target.value })}
                      placeholder="未入力時は自動採番 (M-001...)"
                      className="w-full px-3 py-2 text-sm text-foreground border border-border rounded-md bg-surface focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none transition-all font-mono"
                    />
                  </div>
                )}
                {editingId && (
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">品番</label>
                    <input
                      type="text"
                      value={formData.materialCode}
                      readOnly
                      className="w-full px-3 py-2 text-sm text-muted border border-border rounded-md bg-surface-muted outline-none font-mono cursor-not-allowed"
                    />
                  </div>
                )}
                {usesCategories && (
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">
                      カテゴリ
                    </label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full px-3 py-2 text-sm text-foreground border border-border rounded-md bg-surface focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none cursor-pointer transition-all"
                    >
                      <option value="">{UNCATEGORIZED_LABEL}</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">サイズ</label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full px-3 py-2 text-sm text-foreground border border-border rounded-md bg-surface focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    重量 (kg) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={formData.weightKg}
                    onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm text-foreground border border-border rounded-md bg-surface focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none transition-all font-mono tabular-nums"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-medium border border-border bg-surface text-foreground hover:bg-surface-muted rounded-md transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? '保存中...' : editingId ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* カテゴリフィルター */}
        {usesCategories && (
          <div className="bg-surface border border-border rounded-xl p-2.5 mb-4 flex gap-1.5 overflow-x-auto">
            <FilterPill
              active={filterCategory === 'all'}
              onClick={() => setFilterCategory('all')}
              label="すべて"
              count={materials.length}
            />
            {categories.map((cat) => {
              const count = materials.filter((m) => m.categoryId === cat.id).length;
              return (
                <FilterPill
                  key={cat.id}
                  active={filterCategory === cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  label={cat.name}
                  count={count}
                />
              );
            })}
            {uncategorizedCount > 0 && (
              <FilterPill
                active={filterCategory === 'uncategorized'}
                onClick={() => setFilterCategory('uncategorized')}
                label={UNCATEGORIZED_LABEL}
                count={uncategorizedCount}
              />
            )}
          </div>
        )}

        {/* 資材一覧 */}
        {Object.keys(groupedMaterials).length === 0 ? (
          <div className="bg-surface rounded-xl border border-border px-6 py-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-surface-muted flex items-center justify-center">
              <Package className="h-6 w-6 text-subtle" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">資材が登録されていません</p>
            <p className="text-xs text-muted">
              右上の「資材追加」から新しい資材を登録できます
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {Object.entries(groupedMaterials).map(([categoryName, items]) => {
              const groups = buildGroups(items);
              return (
                <div
                  key={categoryName}
                  className="bg-surface rounded-xl border border-border overflow-hidden mb-3"
                >
                  <div className="px-5 py-3 bg-surface-muted border-b border-border flex items-baseline justify-between">
                    <p className="font-mono text-[11px] uppercase tracking-wider font-semibold text-muted">
                      {categoryName}
                    </p>
                    <span className="font-mono text-[10px] tabular-nums text-subtle">
                      {items.length} 件
                    </span>
                  </div>
                  <SortableContext
                    items={groups.map((g) => g.key)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="divide-y divide-border">
                      {groups.map((group) => (
                        <SortableMaterialGroup
                          key={group.key}
                          group={group}
                          open={openByGroup[group.key] ?? false}
                          sortDir={sortDirByGroup[group.key] ?? 'desc'}
                          onToggleOpen={() => toggleOpen(group.key)}
                          onToggleSort={() => toggleSort(group.key)}
                          onEdit={handleEdit}
                          onDelete={handleDeleteClick}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </DndContext>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-surface rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">資材を削除</DialogTitle>
          </DialogHeader>
          {selectedMaterial && (
            <div className="space-y-2 text-sm">
              <p className="text-foreground">
                「<span className="font-semibold">{selectedMaterial.name}</span>」を削除しますか？
              </p>
              <p className="text-xs text-red-700 font-medium">
                この操作は元に戻せません。
              </p>
            </div>
          )}
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeleteDialogOpen(false)}
              className="px-4 py-2 text-sm font-medium border border-border bg-surface text-foreground hover:bg-surface-muted rounded-md transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={confirmDelete}
              className="px-4 py-2 text-sm font-semibold bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? '削除中...' : '削除'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableMaterialGroup({
  group,
  open,
  sortDir,
  onToggleOpen,
  onToggleSort,
  onEdit,
  onDelete,
}: {
  group: MaterialGroup;
  open: boolean;
  sortDir: 'asc' | 'desc';
  onToggleOpen: () => void;
  onToggleSort: () => void;
  onEdit: (material: Material) => void;
  onDelete: (material: Material) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.key,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const sortedItems = useMemo(() => {
    const arr = [...group.items];
    arr.sort((a, b) => {
      const ka = a.size ?? a.materialCode;
      const kb = b.size ?? b.materialCode;
      const cmp = naturalCollator.compare(ka, kb);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [group.items, sortDir]);

  // 1 件のみのグループはアコーディオンにせず行をそのまま出す
  if (group.items.length === 1) {
    const only = group.items[0];
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-surface px-2 py-3 sm:pl-3 sm:pr-5 flex items-center gap-2 sm:gap-3 hover:bg-surface-muted transition-colors touch-none"
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1.5 rounded-md text-subtle hover:text-foreground hover:bg-surface-muted cursor-grab active:cursor-grabbing touch-none"
          aria-label="ドラッグして並び替え"
          title="ドラッグして並び替え"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono text-accent bg-accent-soft border border-accent/20 px-1.5 py-0.5 rounded">
              {only.materialCode}
            </span>
            <span className="text-sm font-medium text-foreground truncate">
              {only.name}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            {only.size && (
              <span className="text-xs text-muted">{only.size}</span>
            )}
            <span className="text-xs text-muted font-mono tabular-nums">
              {only.weightKg}kg
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => onEdit(only)}
            className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-muted transition-colors"
            title="編集"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(only)}
            className="p-1.5 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="削除"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="bg-surface">
      <div className="px-2 py-2.5 sm:pl-3 sm:pr-5 flex items-center gap-1 sm:gap-2 touch-none">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1.5 rounded-md text-subtle hover:text-foreground hover:bg-surface-muted cursor-grab active:cursor-grabbing touch-none"
          aria-label="ドラッグして並び替え"
          title="ドラッグして並び替え"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex-1 min-w-0 flex items-center gap-2 text-left p-1 rounded-md hover:bg-surface-muted transition-colors"
          aria-expanded={open}
        >
          <ChevronRight
            className={`h-3.5 w-3.5 text-muted flex-shrink-0 transition-transform ${
              open ? 'rotate-90' : ''
            }`}
          />
          <span className="text-sm font-medium text-foreground truncate">
            {group.name}
          </span>
          <span className="text-[10px] font-mono text-muted bg-surface-muted border border-border px-1.5 py-0.5 rounded flex-shrink-0">
            {group.items.length} 件
          </span>
        </button>
      </div>
      {open && (
        <div className="bg-surface-muted/40 border-t border-border">
          <div className="px-3 py-2 flex justify-end border-b border-border">
            <button
              type="button"
              onClick={onToggleSort}
              className="px-2 py-1 rounded-md text-foreground hover:bg-surface-muted transition-colors inline-flex items-center gap-1 border border-border bg-surface"
              title={sortDir === 'asc' ? 'サイズ昇順 (クリックで降順)' : 'サイズ降順 (クリックで昇順)'}
              aria-label={sortDir === 'asc' ? 'サイズ昇順' : 'サイズ降順'}
            >
              {sortDir === 'asc' ? (
                <ArrowDownAZ className="h-3.5 w-3.5" />
              ) : (
                <ArrowUpAZ className="h-3.5 w-3.5" />
              )}
              <span className="text-xs font-medium">
                {sortDir === 'asc' ? 'サイズ昇順' : 'サイズ降順'}
              </span>
            </button>
          </div>
          <div className="divide-y divide-border">
            {sortedItems.map((material) => (
              <MaterialSizeRow
                key={material.id}
                material={material}
                onEdit={() => onEdit(material)}
                onDelete={() => onDelete(material)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MaterialSizeRow({
  material,
  onEdit,
  onDelete,
}: {
  material: Material;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="pl-10 sm:pl-14 pr-3 sm:pr-5 py-2 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-accent bg-accent-soft border border-accent/20 px-1.5 py-0.5 rounded">
            {material.materialCode}
          </span>
          {material.size ? (
            <span className="text-sm font-medium text-foreground truncate">
              {material.size}
            </span>
          ) : (
            <span className="text-xs text-subtle italic">サイズ指定なし</span>
          )}
          <span className="text-xs text-muted font-mono tabular-nums">
            {material.weightKg}kg
          </span>
        </div>
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-muted transition-colors"
          title="編集"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="削除"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border flex items-center gap-1.5 ${
        active
          ? 'bg-foreground text-background border-foreground'
          : 'bg-surface text-foreground border-border hover:bg-surface-muted'
      }`}
    >
      {label}
      <span
        className={`font-mono text-[11px] tabular-nums ${
          active ? 'opacity-70' : 'text-subtle'
        }`}
      >
        {count}
      </span>
    </button>
  );
}
