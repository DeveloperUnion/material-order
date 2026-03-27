'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, UserPlus, Check, Users, Mail, MoreVertical, Shield, ShieldOff, UserX, UserCheck, Clock, Trash2 } from 'lucide-react';

interface TenantInfo {
  id: string;
  name: string;
  settings: Record<string, unknown> | null;
  maxUsers: number;
  currentUsers: number;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
  isActive: boolean;
  joinedAt: string | null;
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

  // テナント情報
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 会社名編集
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);

  // ユーザー管理
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  // 招待フォーム
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // ユーザー編集
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [tenantRes, usersRes, invitationsRes] = await Promise.all([
        fetch('/api/tenant'),
        fetch('/api/users'),
        fetch('/api/invitations'),
      ]);

      if (tenantRes.status === 403 || usersRes.status === 403 || invitationsRes.status === 403) {
        router.push('/dashboard');
        return;
      }

      if (tenantRes.status === 401 || usersRes.status === 401 || invitationsRes.status === 401) {
        router.push('/');
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
  }, [router]);

  useEffect(() => {
    if (session && session.user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [session, router, fetchData]);

  // メニュー外クリックで閉じる
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

      setTenant((prev) => prev ? { ...prev, name: data.tenant.name } : null);
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

    try {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('この招待を削除しますか？')) return;

    try {
      const res = await fetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '招待の削除に失敗しました');
      }

      setInvitations(invitations.filter(inv => inv.id !== invitationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const handleUpdateUser = async (userId: string, data: { role?: 'ADMIN' | 'MEMBER'; isActive?: boolean }) => {
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

      setUsers(users.map(u => u.id === userId ? { ...u, ...result.user } : u));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setUpdateLoading(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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
    <div className="min-h-screen bg-[#f4f4f5]">
      <div className="max-w-3xl mx-auto px-4 py-8">
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
          <h1 className="text-xl font-bold text-[#18181b]">会社設定</h1>
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

        {/* 会社情報 */}
        <div className="bg-white rounded-2xl border border-[#e4e4e7] p-6 mb-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-[#eef2ff] rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-[#6366f1]" />
            </div>
            <h2 className="text-base font-bold text-[#18181b]">会社情報</h2>
          </div>

          <div className="space-y-4">
            {/* 会社名 */}
            <div className="flex items-center justify-between py-3 border-b border-[#e4e4e7]">
              <div className="flex-1">
                <p className="text-xs text-[#71717a] mb-1">会社名</p>
                {editingName ? (
                  <form onSubmit={handleUpdateName} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm text-[#18181b] border border-[#d4d4d8] rounded-lg focus:ring-2 focus:ring-[#0891b2] focus:border-transparent outline-none"
                      autoFocus
                    />
                    <Button type="submit" size="sm" disabled={nameLoading} className="bg-[#0891b2] hover:bg-[#0e7490] text-white">
                      {nameLoading ? '...' : '保存'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="border border-[#d4d4d8] bg-white text-[#18181b] hover:bg-[#f4f4f5]"
                      onClick={() => {
                        setEditingName(false);
                        setNewName(tenant?.name || '');
                      }}
                    >
                      キャンセル
                    </Button>
                  </form>
                ) : (
                  <p className="text-sm font-medium text-[#18181b]">{tenant?.name}</p>
                )}
              </div>
              {!editingName && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingName(true)}
                  className="text-[#6366f1] hover:text-[#0e7490]"
                >
                  編集
                </Button>
              )}
            </div>

            {/* 登録日 */}
            <div className="py-3">
              <p className="text-xs text-[#71717a] mb-1">登録日</p>
              <p className="text-sm text-[#18181b]">{tenant ? formatDate(tenant.createdAt) : '-'}</p>
            </div>
          </div>
        </div>

        {/* メンバー管理 */}
        <div className="bg-white rounded-2xl border border-[#e4e4e7] overflow-hidden">
          {/* ヘッダー + 利用状況 */}
          <div className="p-6 border-b border-[#e4e4e7]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#eef2ff] rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-[#6366f1]" />
                </div>
                <h2 className="text-base font-bold text-[#18181b]">メンバー</h2>
                <span className="text-sm text-[#71717a]">({users.length}名)</span>
              </div>
              <Button
                onClick={() => {
                  setShowInviteForm(!showInviteForm);
                  setInviteSuccess(null);
                }}
                size="sm"
                className="bg-[#0891b2] hover:bg-[#0e7490] text-white"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                招待
              </Button>
            </div>

            {/* 利用状況バー */}
            <div className="flex items-center justify-between text-xs text-[#71717a] mb-1.5">
              <span>利用状況</span>
              <span>{tenant?.currentUsers} / {tenant?.maxUsers} 名</span>
            </div>
            <div className="w-full bg-[#e4e4e7] rounded-full h-1.5">
              <div
                className="bg-[#0891b2] h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.min((tenant?.currentUsers || 0) / (tenant?.maxUsers || 1) * 100, 100)}%`,
                }}
              />
            </div>
            {tenant && tenant.currentUsers >= tenant.maxUsers && (
              <p className="text-xs text-orange-600 mt-1.5">
                ユーザー数の上限に達しています
              </p>
            )}
          </div>

          {/* 招待フォーム */}
          {showInviteForm && (
            <div className="px-6 py-4 border-b border-[#e4e4e7] bg-[#fafafa]">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-4 w-4 text-[#71717a]" />
                <p className="text-sm font-medium text-[#18181b]">新規メンバーを招待</p>
              </div>
              <form onSubmit={handleInvite}>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="メールアドレスを入力"
                    required
                    className="flex-1 px-3 py-2 text-sm text-[#18181b] border border-[#d4d4d8] rounded-lg focus:ring-2 focus:ring-[#0891b2] focus:border-transparent outline-none placeholder:text-[#a1a1aa]"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
                    className="sm:w-28 px-3 py-2 text-sm text-[#18181b] border border-[#d4d4d8] rounded-lg focus:ring-2 focus:ring-[#0891b2] focus:border-transparent outline-none bg-white"
                  >
                    <option value="MEMBER">メンバー</option>
                    <option value="ADMIN">管理者</option>
                  </select>
                  <Button
                    type="submit"
                    disabled={inviteLoading}
                    size="sm"
                    className="bg-[#0891b2] hover:bg-[#0e7490] text-white"
                  >
                    {inviteLoading ? '送信中...' : '送信'}
                  </Button>
                </div>
              </form>
              {inviteSuccess && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-700 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    {inviteSuccess}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ユーザー一覧 */}
          <div className="divide-y divide-[#f4f4f5]">
            {users.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-[#71717a]">
                メンバーがいません
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className={`px-6 py-3.5 flex items-center justify-between hover:bg-[#fafafa] transition-colors ${
                    !user.isActive ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        !user.isActive
                          ? 'bg-[#e4e4e7] text-[#a1a1aa]'
                          : user.role === 'ADMIN'
                          ? 'bg-[#eef2ff] text-[#6366f1]'
                          : 'bg-[#f4f4f5] text-[#71717a]'
                      }`}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-[#18181b]">{user.name}</span>
                        {user.id === session?.user?.id && (
                          <span className="text-[10px] text-[#6366f1] bg-[#eef2ff] px-1.5 py-0.5 rounded">自分</span>
                        )}
                        {!user.isActive && (
                          <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded">無効</span>
                        )}
                      </div>
                      <p className="text-xs text-[#71717a]">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        user.role === 'ADMIN'
                          ? 'bg-[#eef2ff] text-[#6366f1]'
                          : 'bg-[#f4f4f5] text-[#71717a]'
                      }`}
                    >
                      {user.role === 'ADMIN' ? '管理者' : 'メンバー'}
                    </span>

                    {user.id !== session?.user?.id && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === user.id ? null : user.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-[#f4f4f5] transition-colors"
                          disabled={updateLoading === user.id}
                        >
                          {updateLoading === user.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#d4d4d8] border-t-[#0891b2]" />
                          ) : (
                            <MoreVertical className="h-4 w-4 text-[#a1a1aa]" />
                          )}
                        </button>

                        {openMenuId === user.id && (
                          <div
                            className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-[#e4e4e7] py-1 z-20"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {user.role === 'MEMBER' ? (
                              <button
                                onClick={() => handleUpdateUser(user.id, { role: 'ADMIN' })}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-[#fafafa] flex items-center gap-2 text-[#18181b]"
                              >
                                <Shield className="h-4 w-4 text-[#6366f1]" />
                                管理者に変更
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateUser(user.id, { role: 'MEMBER' })}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-[#fafafa] flex items-center gap-2 text-[#18181b]"
                              >
                                <ShieldOff className="h-4 w-4 text-[#71717a]" />
                                メンバーに変更
                              </button>
                            )}
                            <div className="border-t border-[#f4f4f5] my-1" />
                            {user.isActive ? (
                              <button
                                onClick={() => handleUpdateUser(user.id, { isActive: false })}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                              >
                                <UserX className="h-4 w-4" />
                                無効化
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateUser(user.id, { isActive: true })}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 flex items-center gap-2 text-green-600"
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
            <div className="border-t border-[#e4e4e7]">
              <div className="px-6 py-3 flex items-center gap-2 bg-[#fafafa]">
                <Clock className="h-4 w-4 text-[#71717a]" />
                <p className="text-xs font-medium text-[#71717a]">保留中の招待 ({invitations.length}件)</p>
              </div>
              <div className="divide-y divide-[#f4f4f5]">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="px-6 py-3.5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center">
                        <Mail className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#18181b]">{invitation.email}</p>
                        <p className="text-xs text-[#a1a1aa]">
                          有効期限: {formatDate(invitation.expiresAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          invitation.role === 'ADMIN'
                            ? 'bg-[#eef2ff] text-[#6366f1]'
                            : 'bg-[#f4f4f5] text-[#71717a]'
                        }`}
                      >
                        {invitation.role === 'ADMIN' ? '管理者' : 'メンバー'}
                      </span>
                      <button
                        onClick={() => handleDeleteInvitation(invitation.id)}
                        className="p-1.5 rounded-lg text-[#a1a1aa] hover:text-red-500 hover:bg-red-50 transition-colors"
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
        </div>
      </div>
    </div>
  );
}
