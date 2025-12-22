'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus, Copy, Check, Users, Mail, MoreVertical, Shield, ShieldOff, UserX, UserCheck, Clock } from 'lucide-react';

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

export default function UserManagementPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 招待フォーム
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  // ユーザー編集
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [usersRes, invitationsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/invitations'),
      ]);

      if (usersRes.status === 403 || invitationsRes.status === 403) {
        router.push('/dashboard');
        return;
      }

      if (usersRes.status === 401 || invitationsRes.status === 401) {
        router.push('/');
        return;
      }

      if (!usersRes.ok || !invitationsRes.ok) {
        throw new Error('データの取得に失敗しました');
      }

      const usersData = await usersRes.json();
      const invitationsData = await invitationsRes.json();

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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setError(null);
    setInviteSuccess(null);
    setInviteUrl(null);

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

      setInviteUrl(data.inviteUrl);
      setInviteSuccess(
        data.emailSent
          ? `${inviteEmail} に招待メールを送信しました`
          : '招待を作成しました（メール送信はスキップされました）'
      );
      setInvitations([data.invitation, ...invitations]);
      setInviteEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInviteUrl = async () => {
    if (inviteUrl) {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
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
              <h1 className="text-xl font-semibold text-gray-900">ユーザー管理</h1>
              <p className="text-sm text-gray-500">チームメンバーの招待・管理</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setShowInviteForm(!showInviteForm);
              setInviteSuccess(null);
              setInviteUrl(null);
            }}
            className="bg-slate-800 hover:bg-slate-900 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            招待
          </Button>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* 招待フォーム */}
        {showInviteForm && (
          <div className="mb-6 p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-gray-600" />
              <h2 className="font-medium text-gray-900">新規メンバーを招待</h2>
            </div>

            <form onSubmit={handleInvite}>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="メールアドレスを入力"
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="sm:w-32">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="MEMBER">メンバー</option>
                    <option value="ADMIN">管理者</option>
                  </select>
                </div>
                <Button
                  type="submit"
                  disabled={inviteLoading}
                  className="bg-slate-800 hover:bg-slate-900 text-white sm:w-auto"
                >
                  {inviteLoading ? '送信中...' : '招待を送信'}
                </Button>
              </div>
            </form>

            {/* 成功メッセージ */}
            {inviteSuccess && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {inviteSuccess}
                </p>
                {inviteUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={inviteUrl}
                      readOnly
                      className="flex-1 px-2 py-1.5 text-xs bg-white border border-green-300 rounded text-gray-600"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyInviteUrl}
                      className="text-xs"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ユーザー一覧 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-600" />
              <h2 className="font-medium text-gray-900">メンバー</h2>
              <span className="text-sm text-gray-500">({users.length}名)</span>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {users.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-500 text-sm">
                メンバーがいません
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className={`px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    !user.isActive ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium ${
                        !user.isActive
                          ? 'bg-gray-200 text-gray-400'
                          : user.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${!user.isActive ? 'text-gray-400' : 'text-gray-900'}`}>
                          {user.name}
                        </span>
                        {user.id === session?.user?.id && (
                          <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">自分</span>
                        )}
                        {!user.isActive && (
                          <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">無効</span>
                        )}
                      </div>
                      <div className={`text-sm ${!user.isActive ? 'text-gray-400' : 'text-gray-500'}`}>
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        user.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
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
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          disabled={updateLoading === user.id}
                        >
                          {updateLoading === user.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                          ) : (
                            <MoreVertical className="h-4 w-4 text-gray-400" />
                          )}
                        </button>

                        {openMenuId === user.id && (
                          <div
                            className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {user.role === 'MEMBER' ? (
                              <button
                                onClick={() => handleUpdateUser(user.id, { role: 'ADMIN' })}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                              >
                                <Shield className="h-4 w-4 text-purple-600" />
                                管理者に変更
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateUser(user.id, { role: 'MEMBER' })}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                              >
                                <ShieldOff className="h-4 w-4 text-gray-500" />
                                メンバーに変更
                              </button>
                            )}
                            <div className="border-t border-gray-100 my-1" />
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
        </div>

        {/* 保留中の招待 */}
        {invitations.length > 0 && (
          <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-600" />
              <h2 className="font-medium text-gray-900">保留中の招待</h2>
              <span className="text-sm text-gray-500">({invitations.length}件)</span>
            </div>

            <div className="divide-y divide-gray-100">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="px-5 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-gray-900 font-medium">{invitation.email}</div>
                      <div className="text-sm text-gray-500">
                        有効期限: {formatDate(invitation.expiresAt)}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      invitation.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {invitation.role === 'ADMIN' ? '管理者' : 'メンバー'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
