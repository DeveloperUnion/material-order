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
  UserPlus,
  Check,
  MoreVertical,
  Shield,
  ShieldOff,
  UserX,
  UserCheck,
  Trash2,
  Mail,
  KeyRound,
  Copy,
} from 'lucide-react';

type AuthMode = 'EMAIL' | 'NAME';

interface TenantInfo {
  id: string;
  code: string;
  name: string;
  settings: Record<string, unknown> | null;
  maxUsers: number;
  currentUsers: number;
  authMode: AuthMode;
  createdAt: string;
}

interface User {
  id: string;
  email: string | null;
  name: string;
  role: 'ADMIN' | 'MEMBER';
  isActive: boolean;
  joinedAt: string | null;
  passwordSetupExpiresAt: string | null;
  lastLoginAt: string | null;
}

interface Invitation {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  expiresAt: string;
}

export default function CompanySettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const t = useTenantPath();

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [createdUserName, setCreatedUserName] = useState<string | null>(null);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [isDeletingInvitation, setIsDeletingInvitation] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [tenantRes, usersRes, invitationsRes] = await Promise.all([
        fetch('/api/tenant'),
        fetch('/api/users'),
        fetch('/api/invitations'),
      ]);

      if (tenantRes.status === 403 || usersRes.status === 403 || invitationsRes.status === 403) {
        router.push(t('/dashboard'));
        return;
      }

      if (tenantRes.status === 401 || usersRes.status === 401 || invitationsRes.status === 401) {
        router.push(t('/'));
        return;
      }

      if (!tenantRes.ok || !usersRes.ok || !invitationsRes.ok) {
        throw new Error('データの取得に失敗しました');
      }

      const tenantData = await tenantRes.json();
      const usersData = await usersRes.json();
      const invitationsData = await invitationsRes.json();

      setTenant(tenantData.tenant);
      setNewName(tenantData.tenant.name);
      setUsers(usersData.users || []);
      setInvitations(invitationsData.invitations || []);
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

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

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

      setTenant((prev) => (prev ? { ...prev, name: data.tenant.name } : null));
      setEditingName(false);
      setSuccess('会社名を更新しました');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setNameLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setError(null);
    setInviteSuccess(null);
    setCreatedUserName(null);

    const isNameMode = tenant?.authMode === 'NAME';

    try {
      if (isNameMode) {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: inviteName,
            email: inviteEmail || null,
            role: inviteRole,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'メンバーの追加に失敗しました');
        }

        setUsers([...users, data.user]);
        setCreatedUserName(data.user.name);
        setInviteSuccess('メンバーを追加しました。ログイン情報をご本人にお伝えください。');
        setInviteName('');
        setInviteEmail('');
      } else {
        const res = await fetch('/api/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: inviteEmail,
            role: inviteRole,
            sendEmail: true,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || '招待の送信に失敗しました');
        }

        setInviteSuccess('招待メールを送信しました');
        setInvitations([data.invitation, ...invitations]);
        setInviteEmail('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRegeneratePassword = async (userId: string) => {
    setUpdateLoading(userId);
    setError(null);
    setOpenMenuId(null);

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regeneratePasswordSetup: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'パスワード再発行に失敗しました');
      setUsers(users.map((u) => (u.id === userId ? { ...u, ...data.user } : u)));
      setSuccess(
        tenant?.authMode === 'NAME'
          ? 'パスワードを再発行しました。本人にログイン URL を伝えてください（24h 有効）'
          : 'パスワードを再発行しました。本人にトップページから再設定するよう伝えてください（24h 有効）'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setUpdateLoading(null);
    }
  };

  const copyLoginInfo = async (userName: string) => {
    if (!tenant) return;
    const text =
      `ログイン URL: ${window.location.origin}\n` +
      `会社コード: ${tenant.code}\n` +
      `お名前: ${userName}\n` +
      '初回ログイン時に名前を選んでパスワードを設定してください。';
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('ログイン情報をクリップボードにコピーしました');
    } catch {
      setError('クリップボードへのコピーに失敗しました');
    }
  };

  const handleDeleteInvitationClick = (invitation: Invitation) => {
    setSelectedInvitation(invitation);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteInvitation = async () => {
    if (!selectedInvitation) return;
    setIsDeletingInvitation(true);
    try {
      const res = await fetch(`/api/invitations/${selectedInvitation.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '招待の削除に失敗しました');
      }

      setInvitations(invitations.filter((inv) => inv.id !== selectedInvitation.id));
      setDeleteDialogOpen(false);
      setSelectedInvitation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsDeletingInvitation(false);
    }
  };

  const handleUpdateUser = async (
    userId: string,
    data: { role?: 'ADMIN' | 'MEMBER'; isActive?: boolean }
  ) => {
    setUpdateLoading(userId);
    setError(null);
    setOpenMenuId(null);

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'ユーザーの更新に失敗しました');
      }

      setUsers(users.map((u) => (u.id === userId ? { ...u, ...result.user } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setUpdateLoading(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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

  const usagePercent = tenant
    ? Math.min((tenant.currentUsers / tenant.maxUsers) * 100, 100)
    : 0;
  const usageFull = tenant ? tenant.currentUsers >= tenant.maxUsers : false;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => router.push(t('/dashboard'))}
            className="flex items-center gap-1 px-2 py-1.5 -ml-2 text-sm text-muted hover:text-foreground hover:bg-surface-muted rounded-md transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            会社設定
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

        {/* 会社情報 */}
        <section className="bg-surface rounded-xl border border-border p-5 sm:p-6 mb-4">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xs font-semibold text-foreground tracking-tight">
              会社情報
            </h2>
          </div>

          <div className="space-y-4">
            {/* 会社名 */}
            <div className="flex items-start justify-between gap-3 py-3 border-b border-border">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-wider text-subtle mb-1.5">
                  会社名
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
                        setNewName(tenant?.name || '');
                      }}
                      className="px-3 py-2 text-sm font-medium border border-border bg-surface text-foreground hover:bg-surface-muted rounded-md transition-colors"
                    >
                      キャンセル
                    </button>
                  </form>
                ) : (
                  <p className="text-sm font-medium text-foreground">{tenant?.name}</p>
                )}
              </div>
              {!editingName && (
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="text-sm text-muted hover:text-foreground transition-colors"
                >
                  編集
                </button>
              )}
            </div>

            {/* 登録日 */}
            <div className="py-1">
              <p className="font-mono text-[10px] uppercase tracking-wider text-subtle mb-1.5">
                登録日
              </p>
              <p className="text-sm font-medium text-foreground font-mono tabular-nums">
                {tenant ? formatDate(tenant.createdAt) : '—'}
              </p>
            </div>
          </div>
        </section>

        {/* メンバー管理 */}
        <section className="bg-surface rounded-xl border border-border overflow-visible">
          {/* ヘッダー + 利用状況 */}
          <div className="p-5 sm:p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-baseline gap-2">
                <h2 className="text-xs font-semibold text-foreground tracking-tight">
                  メンバー
                </h2>
                <span className="font-mono text-[10px] tracking-wider text-subtle uppercase tabular-nums">
                  {users.length} 名
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowInviteForm(!showInviteForm);
                  setInviteSuccess(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-md transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                招待
              </button>
            </div>

            {/* 利用状況バー */}
            <div className="flex items-center justify-between text-xs text-muted mb-1.5">
              <span>利用状況</span>
              <span className="font-mono tabular-nums">
                {tenant?.currentUsers} / {tenant?.maxUsers} 名
              </span>
            </div>
            <div className="w-full bg-surface-muted rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  usageFull ? 'bg-amber-500' : 'bg-accent'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            {usageFull && (
              <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                ユーザー数の上限に達しています
              </p>
            )}
          </div>

          {/* 招待 / メンバー追加フォーム */}
          {showInviteForm && tenant && (
            <div className="px-5 sm:px-6 py-4 border-b border-border bg-surface-muted">
              <div className="flex items-center gap-2 mb-3">
                {tenant.authMode === 'NAME' ? (
                  <UserPlus className="h-4 w-4 text-muted" />
                ) : (
                  <Mail className="h-4 w-4 text-muted" />
                )}
                <p className="text-sm font-medium text-foreground">
                  {tenant.authMode === 'NAME' ? '新規メンバーを追加' : '新規メンバーを招待'}
                </p>
              </div>
              <form onSubmit={handleInvite} className="space-y-2">
                {tenant.authMode === 'NAME' ? (
                  <>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        placeholder="名前（必須）例: 山田 太郎"
                        required
                        className="flex-1 min-w-0 px-3 py-2 text-sm text-foreground border border-border rounded-md bg-surface focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none placeholder:text-subtle transition-all"
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
                        className="sm:w-32 px-3 py-2 text-sm text-foreground border border-border rounded-md bg-surface focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none cursor-pointer transition-all"
                      >
                        <option value="MEMBER">メンバー</option>
                        <option value="ADMIN">管理者</option>
                      </select>
                    </div>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="メールアドレス（任意）"
                      className="w-full px-3 py-2 text-sm text-foreground border border-border rounded-md bg-surface focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none placeholder:text-subtle transition-all"
                    />
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="w-full px-4 py-2 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {inviteLoading ? '追加中...' : 'メンバーを追加'}
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="メールアドレスを入力"
                      required
                      className="flex-1 min-w-0 px-3 py-2 text-sm text-foreground border border-border rounded-md bg-surface focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none placeholder:text-subtle transition-all"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
                      className="sm:w-32 px-3 py-2 text-sm text-foreground border border-border rounded-md bg-surface focus:border-accent focus:ring-4 focus:ring-accent/15 outline-none cursor-pointer transition-all"
                    >
                      <option value="MEMBER">メンバー</option>
                      <option value="ADMIN">管理者</option>
                    </select>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="px-4 py-2 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {inviteLoading ? '送信中...' : '送信'}
                    </button>
                  </div>
                )}
              </form>
              {inviteSuccess && (
                <div className="mt-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-md space-y-2">
                  <p className="text-xs text-emerald-700 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    {inviteSuccess}
                  </p>
                  {createdUserName && tenant.authMode === 'NAME' && (
                    <button
                      type="button"
                      onClick={() => copyLoginInfo(createdUserName)}
                      className="inline-flex items-center gap-1 text-xs text-foreground bg-surface border border-border rounded px-2 py-1 hover:bg-surface-muted"
                    >
                      <Copy className="h-3 w-3" />
                      ログイン情報をコピー
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ユーザー一覧 */}
          <div className="divide-y divide-border">
            {users.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted">
                メンバーがいません
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className={`px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3 hover:bg-surface-muted transition-colors ${
                    !user.isActive ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-surface-muted text-muted flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">
                          {user.name}
                        </span>
                        {user.id === session?.user?.id && (
                          <span className="text-[10px] font-mono uppercase tracking-wider text-subtle">
                            自分
                          </span>
                        )}
                        {!user.isActive && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                            無効
                          </span>
                        )}
                        <PasswordStatusBadge user={user} />
                      </div>
                      {user.email && (
                        <p className="text-xs text-muted truncate">{user.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <RoleBadge role={user.role} />

                    {user.id !== session?.user?.id && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === user.id ? null : user.id);
                          }}
                          className="p-1.5 rounded-md hover:bg-surface-muted transition-colors"
                          disabled={updateLoading === user.id}
                          aria-label="ユーザー操作メニュー"
                        >
                          {updateLoading === user.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
                          ) : (
                            <MoreVertical className="h-4 w-4 text-subtle" />
                          )}
                        </button>

                        {openMenuId === user.id && (
                          <div
                            className="absolute right-0 mt-1 w-44 bg-surface rounded-xl shadow-lg border border-border py-1 z-20"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {user.role === 'MEMBER' ? (
                              <button
                                type="button"
                                onClick={() => handleUpdateUser(user.id, { role: 'ADMIN' })}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-surface-muted flex items-center gap-2 text-foreground"
                              >
                                <Shield className="h-4 w-4 text-accent" />
                                管理者に変更
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUpdateUser(user.id, { role: 'MEMBER' })}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-surface-muted flex items-center gap-2 text-foreground"
                              >
                                <ShieldOff className="h-4 w-4 text-muted" />
                                メンバーに変更
                              </button>
                            )}
                            <div className="border-t border-border my-1" />
                            <button
                              type="button"
                              onClick={() => handleRegeneratePassword(user.id)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-surface-muted flex items-center gap-2 text-foreground"
                            >
                              <KeyRound className="h-4 w-4 text-amber-600" />
                              パスワード再発行
                            </button>
                            {tenant?.authMode === 'NAME' && (
                              <button
                                type="button"
                                onClick={() => copyLoginInfo(user.name)}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-surface-muted flex items-center gap-2 text-foreground"
                              >
                                <Copy className="h-4 w-4 text-muted" />
                                ログイン情報をコピー
                              </button>
                            )}
                            <div className="border-t border-border my-1" />
                            {user.isActive ? (
                              <button
                                type="button"
                                onClick={() => handleUpdateUser(user.id, { isActive: false })}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                              >
                                <UserX className="h-4 w-4" />
                                無効化
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUpdateUser(user.id, { isActive: true })}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-emerald-50 flex items-center gap-2 text-emerald-700"
                              >
                                <UserCheck className="h-4 w-4" />
                                有効化
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 保留中の招待 */}
          {invitations.length > 0 && (
            <div className="border-t border-border">
              <div className="px-5 sm:px-6 py-3 flex items-center gap-2 bg-surface-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <p className="text-xs font-medium text-muted">
                  保留中の招待{' '}
                  <span className="font-mono tabular-nums">({invitations.length}件)</span>
                </p>
              </div>
              <div className="divide-y divide-border">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                        <Mail className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {invitation.email}
                        </p>
                        <p className="text-xs text-muted font-mono tabular-nums">
                          有効期限: {formatDate(invitation.expiresAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <RoleBadge role={invitation.role} />
                      <button
                        type="button"
                        onClick={() => handleDeleteInvitationClick(invitation)}
                        className="p-1.5 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="招待を削除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 招待削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-surface rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">招待を削除</DialogTitle>
          </DialogHeader>
          {selectedInvitation && (
            <div className="space-y-2 text-sm">
              <p className="text-foreground">
                「<span className="font-semibold">{selectedInvitation.email}</span>」への招待を削除しますか？
              </p>
              <p className="text-xs text-red-700 font-medium">
                この操作は元に戻せません。
              </p>
            </div>
          )}
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              disabled={isDeletingInvitation}
              onClick={() => setDeleteDialogOpen(false)}
              className="px-4 py-2 text-sm font-medium border border-border bg-surface text-foreground hover:bg-surface-muted rounded-md transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              disabled={isDeletingInvitation}
              onClick={confirmDeleteInvitation}
              className="px-4 py-2 text-sm font-semibold bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeletingInvitation ? '削除中...' : '削除'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PasswordStatusBadge({ user }: { user: User }) {
  if (user.joinedAt) return null;
  const expiresAt = user.passwordSetupExpiresAt
    ? new Date(user.passwordSetupExpiresAt)
    : null;
  const expired = expiresAt ? expiresAt <= new Date() : true;

  if (expired) {
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
        PW 期限切れ
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
      初回ログイン待ち
    </span>
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
