'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, Users, Check } from 'lucide-react';

interface TenantInfo {
  id: string;
  name: string;
  settings: Record<string, unknown> | null;
  maxUsers: number;
  currentUsers: number;
  createdAt: string;
}

export default function TenantSettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 会社名編集
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);

  const fetchTenant = useCallback(async () => {
    try {
      const res = await fetch('/api/tenant');
      if (res.status === 403) {
        router.push('/dashboard');
        return;
      }
      if (!res.ok) {
        throw new Error('テナント情報の取得に失敗しました');
      }
      const data = await res.json();
      setTenant(data.tenant);
      setNewName(data.tenant.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // 管理者でない場合はダッシュボードへリダイレクト
    if (session && session.user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    fetchTenant();
  }, [session, router, fetchTenant]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setNameLoading(true);

    try {
      const res = await fetch('/api/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '会社名の更新に失敗しました');
      }

      setTenant((prev) => prev ? { ...prev, name: data.tenant.name } : null);
      setEditingName(false);
      setSuccess('会社名を更新しました');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setNameLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            戻る
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">テナント設定</h1>
            <p className="text-sm text-gray-500">会社情報の確認・編集</p>
          </div>
        </div>

        {/* メッセージ表示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 flex items-center gap-2">
            <Check className="h-4 w-4" />
            {success}
          </div>
        )}

        {/* 会社情報 */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6 text-slate-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">会社情報</h2>
              <p className="text-sm text-gray-500">テナントの基本情報を管理します</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* 会社名 */}
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex-1">
                <p className="text-sm text-gray-500">会社名</p>
                {editingName ? (
                  <form onSubmit={handleUpdateName} className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="flex-1 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      autoFocus
                    />
                    <Button type="submit" size="sm" disabled={nameLoading}>
                      {nameLoading ? '...' : '保存'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingName(false);
                        setNewName(tenant?.name || '');
                      }}
                    >
                      キャンセル
                    </Button>
                  </form>
                ) : (
                  <p className="text-gray-900 font-medium">{tenant?.name}</p>
                )}
              </div>
              {!editingName && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingName(true)}
                >
                  編集
                </Button>
              )}
            </div>

            {/* 作成日 */}
            <div className="py-3 border-b">
              <p className="text-sm text-gray-500">登録日</p>
              <p className="text-gray-900">{tenant ? formatDate(tenant.createdAt) : '-'}</p>
            </div>
          </div>
        </div>

        {/* 利用状況 */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">利用状況</h2>
              <p className="text-sm text-gray-500">ユーザー数の上限と現在の利用状況</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* ユーザー数 */}
            <div className="py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">ユーザー数</p>
                <p className="text-sm font-medium text-gray-900">
                  {tenant?.currentUsers} / {tenant?.maxUsers} 名
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min((tenant?.currentUsers || 0) / (tenant?.maxUsers || 1) * 100, 100)}%`,
                  }}
                />
              </div>
              {tenant && tenant.currentUsers >= tenant.maxUsers && (
                <p className="text-xs text-orange-600 mt-1">
                  ユーザー数の上限に達しています。追加のユーザーを招待するには、プランのアップグレードが必要です。
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
