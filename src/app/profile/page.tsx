'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Check, Eye, EyeOff, Shield } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string | null;
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

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

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

      setProfile((prev) => (prev ? { ...prev, name: data.user.name } : null));
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

  const cancelPasswordChange = () => {
    setShowPasswordForm(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
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
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1 px-2 py-1.5 -ml-2 text-sm text-muted hover:text-foreground hover:bg-surface-muted rounded-md transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            プロフィール
          </h1>
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

        {/* プロフィール情報カード */}
        <section className="bg-surface rounded-xl border border-border p-5 sm:p-6 mb-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-surface-muted text-muted flex items-center justify-center text-lg font-semibold flex-shrink-0">
              {profile?.name?.charAt(0).toUpperCase() || '—'}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground tracking-tight truncate">
                {profile?.name}
              </h2>
              {profile?.email && (
                <p className="text-sm text-muted truncate">{profile.email}</p>
              )}
            </div>
          </div>

          <div>
            {/* 名前 */}
            <div className="flex items-start justify-between gap-3 py-3 border-b border-border">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-wider text-subtle mb-1.5">
                  名前
                </p>
                {editingName ? (
                  <form onSubmit={handleUpdateName} className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="flex-1 min-w-0 px-3 py-2 text-sm text-foreground border border-border rounded-md bg-surface focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none transition-all"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={nameLoading}
                      className="px-3 py-2 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-md transition-colors disabled:opacity-50"
                    >
                      {nameLoading ? '...' : '保存'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingName(false);
                        setNewName(profile?.name || '');
                      }}
                      className="px-3 py-2 text-sm font-medium border border-border bg-surface text-foreground hover:bg-surface-muted rounded-md transition-colors"
                    >
                      キャンセル
                    </button>
                  </form>
                ) : (
                  <p className="text-sm font-medium text-foreground">{profile?.name}</p>
                )}
              </div>
              {!editingName && (
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="text-sm text-muted hover:text-foreground transition-colors flex-shrink-0"
                >
                  編集
                </button>
              )}
            </div>

            {/* メールアドレス */}
            <InfoRow label="メールアドレス" value={profile?.email || '—'} />

            {/* 権限 */}
            <div className="py-3 border-b border-border">
              <p className="font-mono text-[10px] uppercase tracking-wider text-subtle mb-1.5">
                権限
              </p>
              <RoleBadge role={profile?.role || 'MEMBER'} />
            </div>

            {/* 所属 */}
            <InfoRow label="所属" value={profile?.tenantName || '—'} />

            {/* 登録日 */}
            <InfoRow
              label="登録日"
              value={formatDate(profile?.joinedAt || null)}
              mono
            />

            {/* 最終ログイン */}
            <div className="py-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-subtle mb-1.5">
                最終ログイン
              </p>
              <p className="text-sm font-medium text-foreground font-mono tabular-nums">
                {formatDate(profile?.lastLoginAt || null)}
              </p>
            </div>
          </div>
        </section>

        {/* パスワード変更カード */}
        <section className="bg-surface rounded-xl border border-border p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h2 className="text-xs font-semibold text-foreground tracking-tight">
              パスワード変更
            </h2>
            {!showPasswordForm && (
              <button
                type="button"
                onClick={() => setShowPasswordForm(true)}
                className="px-3 py-1.5 text-sm font-medium border border-border bg-surface text-foreground hover:bg-surface-muted rounded-md transition-colors"
              >
                パスワードを変更
              </button>
            )}
          </div>

          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <PasswordField
                label="現在のパスワード"
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrentPassword}
                onToggleShow={() => setShowCurrentPassword(!showCurrentPassword)}
              />
              <PasswordField
                label="新しいパスワード"
                value={newPassword}
                onChange={setNewPassword}
                show={showNewPassword}
                onToggleShow={() => setShowNewPassword(!showNewPassword)}
                placeholder="8文字以上"
              />
              <PasswordField
                label="新しいパスワード（確認）"
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirmPassword}
                onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
                placeholder="8文字以上"
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {passwordLoading ? '変更中...' : 'パスワードを変更'}
                </button>
                <button
                  type="button"
                  onClick={cancelPasswordChange}
                  className="px-4 py-2 text-sm font-medium border border-border bg-surface text-foreground hover:bg-surface-muted rounded-md transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="py-3 border-b border-border">
      <p className="font-mono text-[10px] uppercase tracking-wider text-subtle mb-1.5">
        {label}
      </p>
      <p className={`text-sm font-medium text-foreground ${mono ? 'font-mono tabular-nums' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function RoleBadge({ role }: { role: 'ADMIN' | 'MEMBER' }) {
  if (role === 'ADMIN') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-soft text-accent border border-accent/20">
        <Shield className="h-3 w-3" />
        管理者
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-muted text-muted border border-border">
      メンバー
    </span>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 text-sm text-foreground border border-border rounded-md bg-surface focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none placeholder:text-subtle transition-all"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-muted transition-colors"
          aria-label={show ? 'パスワードを隠す' : 'パスワードを表示'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
