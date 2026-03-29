'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
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

  // 追加/編集フォーム
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    size: '',
    weightKg: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  // フィルター
  const [filterCategory, setFilterCategory] = useState<string>('all');

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
        // 更新
        const res = await fetch(`/api/materials/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '更新に失敗しました');

        setMaterials(materials.map(m => m.id === editingId ? data.material : m));
        setSuccess('資材を更新しました');
      } else {
        // 新規作成
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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    setError(null);

    try {
      const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '削除に失敗しました');
      }
      setMaterials(materials.filter(m => m.id !== id));
      setSuccess(`「${name}」を削除しました`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const filteredMaterials = filterCategory === 'all'
    ? materials
    : materials.filter(m => m.categoryId === filterCategory);

  // カテゴリごとにグルーピング
  const groupedMaterials = filteredMaterials.reduce<Record<string, Material[]>>((acc, m) => {
    const catName = m.category.name;
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(m);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f4f4f5]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0891b2] mx-auto"></div>
          <p className="mt-4 text-sm text-[#71717a]">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f5]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="text-[#71717a] hover:text-[#18181b]"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              戻る
            </Button>
            <h1 className="text-xl font-bold text-[#18181b]">資材管理</h1>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
              setSuccess(null);
            }}
            size="sm"
            className="bg-slate-800 hover:bg-slate-900 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            資材追加
          </Button>
        </div>

        {/* メッセージ */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2">
            <Check className="h-4 w-4" />
            {success}
          </div>
        )}

        {/* 追加/編集フォーム */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-[#e4e4e7] p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#18181b]">
                {editingId ? '資材を編集' : '新規資材を追加'}
              </h2>
              <button onClick={resetForm} className="p-1 rounded-lg hover:bg-[#f4f4f5]">
                <X className="h-4 w-4 text-[#71717a]" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#71717a] mb-1 block">資材名 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm text-[#18181b] border border-[#d4d4d8] rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#71717a] mb-1 block">カテゴリ *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm text-[#18181b] border border-[#d4d4d8] rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="">選択してください</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#71717a] mb-1 block">サイズ</label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full px-3 py-2 text-sm text-[#18181b] border border-[#d4d4d8] rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#71717a] mb-1 block">重量 (kg) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.weightKg}
                    onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm text-[#18181b] border border-[#d4d4d8] rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" size="sm" onClick={resetForm} className="border border-[#d4d4d8] bg-white text-[#18181b] hover:bg-[#f4f4f5]">
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={formLoading}
                  className="bg-slate-800 hover:bg-slate-900 text-white"
                >
                  {formLoading ? '保存中...' : editingId ? '更新' : '追加'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* カテゴリフィルター */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              filterCategory === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-white border border-[#e4e4e7] text-[#71717a] hover:bg-[#fafafa]'
            }`}
          >
            すべて ({materials.length})
          </button>
          {categories.map(cat => {
            const count = materials.filter(m => m.categoryId === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  filterCategory === cat.id
                    ? 'bg-slate-800 text-white'
                    : 'bg-white border border-[#e4e4e7] text-[#71717a] hover:bg-[#fafafa]'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* 資材一覧 */}
        {Object.keys(groupedMaterials).length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e4e4e7] px-6 py-12 text-center">
            <Package className="h-10 w-10 text-[#d4d4d8] mx-auto mb-3" />
            <p className="text-sm text-[#71717a]">資材が登録されていません</p>
          </div>
        ) : (
          Object.entries(groupedMaterials).map(([categoryName, items]) => (
            <div key={categoryName} className="bg-white rounded-2xl border border-[#e4e4e7] overflow-hidden mb-3">
              <div className="px-5 py-3 bg-[#fafafa] border-b border-[#e4e4e7]">
                <p className="text-xs font-bold text-[#71717a] uppercase tracking-wider">{categoryName}</p>
              </div>
              <div className="divide-y divide-[#f4f4f5]">
                {items.map((material) => (
                  <div
                    key={material.id}
                    className="px-5 py-3 flex items-center justify-between hover:bg-[#fafafa] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[#0891b2] bg-[#ecfeff] px-1.5 py-0.5 rounded">
                          {material.materialCode}
                        </span>
                        <span className="text-sm font-medium text-[#18181b] truncate">{material.name}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {material.size && (
                          <span className="text-xs text-[#71717a]">{material.size}</span>
                        )}
                        <span className="text-xs text-[#71717a]">{material.weightKg}kg</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      <button
                        onClick={() => handleEdit(material)}
                        className="p-1.5 rounded-lg text-[#a1a1aa] hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        title="編集"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(material.id, material.name)}
                        className="p-1.5 rounded-lg text-[#a1a1aa] hover:text-red-500 hover:bg-red-50 transition-colors"
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
    </div>
  );
}
