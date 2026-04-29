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
import { ArrowLeft, Plus, Check, Truck as TruckIcon, Pencil, Trash2, X } from 'lucide-react';

interface Truck {
  id: string;
  name: string;
  capacityKg: number;
  isActive: boolean;
}

export default function TrucksPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const t = useTenantPath();

  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    capacityKg: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/trucks');
      if (res.status === 401) {
        router.push(t('/'));
        return;
      }
      if (!res.ok) {
        throw new Error('データの取得に失敗しました');
      }
      const data = await res.json();
      setTrucks(data);
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
    setFormData({ name: '', capacityKg: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (truck: Truck) => {
    setFormData({
      name: truck.name,
      capacityKg: String(truck.capacityKg),
    });
    setEditingId(truck.id);
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
        const res = await fetch(`/api/trucks/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '更新に失敗しました');

        setTrucks(
          trucks
            .map((t) => (t.id === editingId ? data.truck : t))
            .sort((a, b) => a.capacityKg - b.capacityKg || a.name.localeCompare(b.name))
        );
        setSuccess('トラックを更新しました');
      } else {
        const res = await fetch('/api/trucks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '作成に失敗しました');

        setTrucks(
          [...trucks, data].sort(
            (a, b) => a.capacityKg - b.capacityKg || a.name.localeCompare(b.name)
          )
        );
        setSuccess('トラックを追加しました');
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (truck: Truck) => {
    setSelectedTruck(truck);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedTruck) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/trucks/${selectedTruck.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '削除に失敗しました');
      }
      setTrucks(trucks.filter((t) => t.id !== selectedTruck.id));
      setSuccess(`「${selectedTruck.name}」を削除しました`);
      setDeleteDialogOpen(false);
      setSelectedTruck(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

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
              トラック管理
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
            トラック追加
          </button>
        </div>

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
                {editingId ? 'トラックを編集' : '新規トラックを追加'}
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
                    名称 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例: 4tトラック"
                    required
                    className="w-full px-3 py-2 text-sm text-foreground border border-border rounded-md bg-surface focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    積載量 (kg) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    value={formData.capacityKg}
                    onChange={(e) => setFormData({ ...formData, capacityKg: e.target.value })}
                    placeholder="例: 4000"
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

        {trucks.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border px-6 py-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-surface-muted flex items-center justify-center">
              <TruckIcon className="h-6 w-6 text-subtle" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">トラックが登録されていません</p>
            <p className="text-xs text-muted">
              右上の「トラック追加」から登録できます
            </p>
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-3 bg-surface-muted border-b border-border flex items-baseline justify-between">
              <p className="font-mono text-[11px] uppercase tracking-wider font-semibold text-muted">
                登録済みトラック
              </p>
              <span className="font-mono text-[10px] tabular-nums text-subtle">
                {trucks.length} 件
              </span>
            </div>
            <div className="divide-y divide-border">
              {trucks.map((truck) => (
                <div
                  key={truck.id}
                  className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-surface-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {truck.name}
                    </div>
                    <div className="mt-1">
                      <span className="text-xs text-muted font-mono tabular-nums">
                        積載 {truck.capacityKg.toLocaleString()}kg
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEdit(truck)}
                      className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-muted transition-colors"
                      title="編集"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(truck)}
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
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-surface rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">トラックを削除</DialogTitle>
          </DialogHeader>
          {selectedTruck && (
            <div className="space-y-2 text-sm">
              <p className="text-foreground">
                「<span className="font-semibold">{selectedTruck.name}</span>」を削除しますか？
              </p>
              <p className="text-xs text-muted">
                過去の発注に紐づくトラック情報はそのまま保持されます。
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
