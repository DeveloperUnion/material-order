'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, Check, Package, Pencil, Trash2, X } from 'lucide-react';

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
  isActive: boolean;
  isTemporary: boolean;
  category: Category;
  categoryId: string;
}

export default function MaterialsPage() {
  const router = useRouter();
  const { data: session } = useSession();

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
    size: '',
    weightKg: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [materialsRes, categoriesRes] = await Promise.all([
        fetch('/api/materials'),
        fetch('/api/categories'),
      ]);

      if (materialsRes.status === 401 || categoriesRes.status === 401) {
        router.push('/');
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
  }, [router]);

  useEffect(() => {
    if (session && session.user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [session, router, fetchData]);

  const resetForm = () => {
    setFormData({ name: '', categoryId: '', size: '', weightKg: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (material: Material) => {
    setFormData({
      name: material.name,
      categoryId: material.categoryId,
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
          body: JSON.stringify(formData),
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
    filterCategory === 'all' ? materials : materials.filter((m) => m.categoryId === filterCategory);

  const groupedMaterials = filteredMaterials.reduce<Record<string, Material[]>>((acc, m) => {
    const catName = m.category.name;
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(m);
    return acc;
  }, {});

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
              onClick={() => router.push('/dashboard')}
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
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    カテゴリ <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm text-foreground border border-border rounded-md bg-surface focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none cursor-pointer transition-all"
                  >
                    <option value="">選択してください</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
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
        </div>

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
          Object.entries(groupedMaterials).map(([categoryName, items]) => (
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
              <div className="divide-y divide-border">
                {items.map((material) => (
                  <div
                    key={material.id}
                    className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-surface-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-accent bg-accent-soft border border-accent/20 px-1.5 py-0.5 rounded">
                          {material.materialCode}
                        </span>
                        <span className="text-sm font-medium text-foreground truncate">
                          {material.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {material.size && (
                          <span className="text-xs text-muted">{material.size}</span>
                        )}
                        <span className="text-xs text-muted font-mono tabular-nums">
                          {material.weightKg}kg
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEdit(material)}
                        className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-muted transition-colors"
                        title="編集"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(material)}
                        className="p-1.5 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="削除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
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
