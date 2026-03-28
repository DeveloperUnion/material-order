'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Lock, Check, Eye, EyeOff } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
  tenantName: string;
  joinedAt: string | null;
  lastLoginAt: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 名前編集
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);

  // パスワード変更
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // パスワード表示切り替え
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile');
      if (!res.ok) {
        throw new Error('プロフィールの取得に失敗しました');
      }
      const data = await res.json();
      setProfile(data.user);
      setNewName(data.user.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setNameLoading(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '名前の更新に失敗しました');
      }

      setProfile((prev) => prev ? { ...prev, name: data.user.name } : null);
      setEditingName(false);
      setSuccess('名前を更新しました');

      await updateSession({ name: data.user.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setNameLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('新しいパスワードが一致しません');
      return;
    }

    if (newPassword.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'パスワードの変更に失敗しました');
      }

      setSuccess('パスワードを変更しました');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setPasswordLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
    <div className="min-h-screen bg-[#f4f4f5] py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="text-[#71717a] hover:text-[#18181b]"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            戻る
          </Button>
          <h1 className="text-xl font-bold text-[#18181b]">プロフィール</h1>
        </div>

        {/* メッセージ表示 */}
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

        {/* プロフィール情報 */}
        <div className="bg-white rounded-2xl border border-[#e4e4e7] p-6 mb-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-[#ecfeff] flex items-center justify-center">
              <User className="h-7 w-7 text-[#0891b2]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#18181b]">{profile?.name}</h2>
              <p className="text-sm text-[#71717a]">{profile?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* 名前 */}
            <div className="flex items-center justify-between py-3 border-b border-[#e4e4e7]">
              <div className="flex-1">
                <p className="text-xs text-[#71717a] mb-1">名前</p>
                {editingName ? (
                  <form onSubmit={handleUpdateName} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm text-[#18181b] border border-[#d4d4d8] rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                      autoFocus
                    />
                    <Button type="submit" size="sm" disabled={nameLoading} className="bg-slate-800 hover:bg-slate-900 text-white">
                      {nameLoading ? '...' : '保存'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="border border-[#d4d4d8] bg-white text-[#18181b] hover:bg-[#f4f4f5]"
                      onClick={() => {
                        setEditingName(false);
                        setNewName(profile?.name || '');
                      }}
                    >
                      キャンセル
                    </Button>
                  </form>
                ) : (
                  <p className="text-sm font-medium text-[#18181b]">{profile?.name}</p>
                )}
              </div>
              {!editingName && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingName(true)}
                  className="text-slate-600 hover:text-slate-800"
                >
                  編集
                </Button>
              )}
            </div>

            {/* メールアドレス */}
            <div className="py-3 border-b border-[#e4e4e7]">
              <p className="text-xs text-[#71717a] mb-1">メールアドレス</p>
              <p className="text-sm text-[#18181b]">{profile?.email}</p>
            </div>

            {/* 権限 */}
            <div className="py-3 border-b border-[#e4e4e7]">
              <p className="text-xs text-[#71717a] mb-1">権限</p>
              <span
                className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full ${
                  profile?.role === 'ADMIN'
                    ? 'bg-[#ecfeff] text-[#0891b2]'
                    : 'bg-[#f4f4f5] text-[#71717a]'
                }`}
              >
                {profile?.role === 'ADMIN' ? '管理者' : 'メンバー'}
              </span>
            </div>

            {/* 所属 */}
            <div className="py-3 border-b border-[#e4e4e7]">
              <p className="text-xs text-[#71717a] mb-1">所属</p>
              <p className="text-sm text-[#18181b]">{profile?.tenantName}</p>
            </div>

            {/* 登録日 */}
            <div className="py-3 border-b border-[#e4e4e7]">
              <p className="text-xs text-[#71717a] mb-1">登録日</p>
              <p className="text-sm text-[#18181b]">{formatDate(profile?.joinedAt || null)}</p>
            </div>

            {/* 最終ログイン */}
            <div className="py-3">
              <p className="text-xs text-[#71717a] mb-1">最終ログイン</p>
              <p className="text-sm text-[#18181b]">{formatDate(profile?.lastLoginAt || null)}</p>
            </div>
          </div>
        </div>

        {/* パスワード変更 */}
        <div className="bg-white rounded-2xl border border-[#e4e4e7] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#ecfeff] rounded-lg flex items-center justify-center">
              <Lock className="h-5 w-5 text-[#0891b2]" />
            </div>
            <h3 className="text-base font-bold text-[#18181b]">パスワード変更</h3>
          </div>

          {showPasswordForm ? (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs text-[#71717a] mb-1">
                  現在のパスワード
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 pr-10 text-sm text-[#18181b] border border-[#d4d4d8] rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] hover:text-[#71717a]"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#71717a] mb-1">
                  新しいパスワード
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="8文字以上"
                    className="w-full px-3 py-2 pr-10 text-sm text-[#18181b] border border-[#d4d4d8] rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none placeholder:text-[#a1a1aa]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] hover:text-[#71717a]"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#71717a] mb-1">
                  新しいパスワード（確認）
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="8文字以上"
                    className="w-full px-3 py-2 pr-10 text-sm text-[#18181b] border border-[#d4d4d8] rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none placeholder:text-[#a1a1aa]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] hover:text-[#71717a]"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Button
                  type="submit"
                  size="sm"
                  disabled={passwordLoading}
                  className="bg-slate-800 hover:bg-slate-900 text-white"
                >
                  {passwordLoading ? '変更中...' : 'パスワードを変更'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="border border-[#d4d4d8] bg-white text-[#18181b] hover:bg-[#f4f4f5]"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setShowCurrentPassword(false);
                    setShowNewPassword(false);
                    setShowConfirmPassword(false);
                    setError(null);
                  }}
                >
                  キャンセル
                </Button>
              </div>
            </form>
          ) : (
            <Button
              size="sm"
              className="border border-[#d4d4d8] bg-white text-[#18181b] hover:bg-[#f4f4f5]"
              onClick={() => setShowPasswordForm(true)}
            >
              パスワードを変更する
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
