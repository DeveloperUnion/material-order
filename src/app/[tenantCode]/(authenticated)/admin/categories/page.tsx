'use client';

import { useEffect, useState, useCallback } from 'react';
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
  Tag,
  Pencil,
  Trash2,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  displayOrder: number;
}

interface Material {
  id: string;
  categoryId: string | null;
}

export default function CategoriesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const t = useTenantPath();

  const [categories, setCategories] = useState<Category[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [catRes, matRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/materials'),
      ]);

      if (catRes.status === 401 || matRes.status === 401) {
        router.push(t('/'));
        return;
      }

      if (!catRes.ok || !matRes.ok) {
        throw new Error('データの取得に失敗しました');
      }

      const catData = await catRes.json();
      const matData = await matRes.json();
      setCategories(catData);
      setMaterials(matData);
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
  }, [session, router, fetchData, t]);

  const resetForm = () => {
    setFormName('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (category: Category) => {
    setFormName(category.name);
    setEditingId(category.id);
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
        const res = await fetch(`/api/categories/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '更新に失敗しました');

        setCategories(categories.map((c) => (c.id === editingId ? data : c)));
        setSuccess('カテゴリを更新しました');
      } else {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '作成に失敗しました');

        setCategories([...categories, data]);
        setSuccess('カテゴリを追加しました');
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (category: Category) => {
    setSelected(category);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${selected.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '削除に失敗しました');
      }
      setCategories(categories.filter((c) => c.id !== selected.id));
      // 紐づく資材は categoryId が null になる
      setMaterials(materials.map((m) => (m.categoryId === selected.id ? { ...m, categoryId: null } : m)));
      setSuccess(`「${selected.name}」を削除しました`);
      setDeleteDialogOpen(false);
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const move = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[targetIdx];

    setError(null);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/categories/${a.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: b.displayOrder }),
        }),
        fetch(`/api/categories/${b.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: a.displayOrder }),
        }),
      ]);
      if (!resA.ok || !resB.ok) {
        throw new Error('並び替えに失敗しました');
      }
      const updatedA = await resA.json();
      const updatedB = await resB.json();
      setCategories(
        categories.map((c) => {
          if (c.id === updatedA.id) return updatedA;
          if (c.id === updatedB.id) return updatedB;
          return c;
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const sortedCategories = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);

  const countMaterials = (categoryId: string) =>
    materials.filter((m) => m.categoryId === categoryId).length;

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
              カテゴリ管理
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
            カテゴリ追加
          </button>
        </div>

        {categories.length === 0 && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            現在カテゴリは登録されていません。資材はフラットな一覧として扱われます。
            必要に応じて「カテゴリ追加」から登録してください。
          </div>
        )}

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

        {showForm && (
          <div className="bg-surface rounded-xl border border-border p-5 sm:p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-foreground tracking-tight">
                {editingId ? 'カテゴリを編集' : '新規カテゴリを追加'}
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
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  カテゴリ名 <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm text-foreground border border-border rounded-md bg-surface focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none transition-all"
                />
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

        {sortedCategories.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border px-6 py-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-surface-muted flex items-center justify-center">
              <Tag className="h-6 w-6 text-subtle" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">カテゴリは未登録です</p>
            <p className="text-xs text-muted">
              右上の「カテゴリ追加」から作成できます
            </p>
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {sortedCategories.map((category, idx) => {
                const count = countMaterials(category.id);
                return (
                  <div
                    key={category.id}
                    className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-surface-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">
                          {category.name}
                        </span>
                        <span className="text-[10px] font-mono text-muted bg-surface-muted border border-border px-1.5 py-0.5 rounded">
                          {count} 件
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => move(category.id, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="上へ"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(category.id, 'down')}
                        disabled={idx === sortedCategories.length - 1}
                        className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="下へ"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(category)}
                        className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-muted transition-colors"
                        title="編集"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(category)}
                        className="p-1.5 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="削除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-surface rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">カテゴリを削除</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              <p className="text-foreground">
                「<span className="font-semibold">{selected.name}</span>」を削除しますか？
              </p>
              {countMaterials(selected.id) > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  このカテゴリの資材 {countMaterials(selected.id)} 件は「未分類」になります。
                </p>
              )}
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
