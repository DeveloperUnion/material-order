'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { defaultAppConfig } from '@/lib/tenant/config';
import { ArrowRight, X, Check, Shield } from 'lucide-react';

interface InvitationInfo {
  email: string;
  role: 'ADMIN' | 'MEMBER';
  tenantName: string;
  expiresAt: string;
}

export default function InviteRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      try {
        const res = await fetch(`/api/auth/register?token=${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || '招待の検証に失敗しました');
          return;
        }

        setInvitation(data.invitation);
      } catch {
        setError('招待の検証に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('名前を入力してください');
      return;
    }

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '登録に失敗しました');
        return;
      }

      setSuccess(true);

      const signInResult = await signIn('credentials', {
        email: invitation?.email,
        password,
        redirect: false,
      });

      if (signInResult?.ok) {
        router.push('/dashboard');
      } else {
        setTimeout(() => router.push('/'), 2000);
      }
    } catch {
      setError('登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-9 w-9 border-2 border-border border-t-accent mx-auto" />
          <p className="mt-4 text-sm text-muted">招待を確認中...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-start justify-center bg-background pt-16 sm:pt-24 px-4">
        <div className="w-full max-w-md">
          <div className="bg-surface border border-border rounded-2xl p-7 sm:p-8 shadow-sm text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
              <X className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2 tracking-tight">招待が無効です</h2>
            <p className="text-sm text-muted mb-6">{error}</p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
            >
              ログインページへ
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-start justify-center bg-background pt-16 sm:pt-24 px-4">
        <div className="w-full max-w-md">
          <div className="bg-surface border border-border rounded-2xl p-7 sm:p-8 shadow-sm text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2 tracking-tight">登録完了</h2>
            <p className="text-sm text-muted">ダッシュボードへ移動します...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-background pt-12 sm:pt-16 pb-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src={defaultAppConfig.icon}
            alt={defaultAppConfig.title}
            width={486}
            height={823}
            priority
            className="mx-auto h-16 sm:h-20 w-auto mb-5"
          />
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            アカウント登録
          </h1>
          <p className="mt-2 text-sm text-muted">
            <span className="font-semibold text-foreground">{invitation?.tenantName}</span>
            への招待
          </p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-7 sm:p-8 shadow-sm">
          {/* 招待情報 */}
          <div className="mb-5 pb-5 border-b border-border space-y-2.5">
            <div className="flex items-start gap-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-subtle pt-0.5 w-16 flex-shrink-0">
                メール
              </span>
              <span className="text-sm font-medium text-foreground break-all">
                {invitation?.email}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-subtle pt-0.5 w-16 flex-shrink-0">
                権限
              </span>
              {invitation?.role === 'ADMIN' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-soft text-accent border border-accent/20">
                  <Shield className="h-3 w-3" />
                  管理者
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-muted text-muted border border-border">
                  メンバー
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-muted mb-2">
                名前
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="山田 太郎"
                className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-foreground text-sm placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 transition-all outline-none"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-muted mb-2">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="8文字以上"
                className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-foreground text-sm placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 transition-all outline-none"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-muted mb-2">
                パスワード（確認）
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="パスワードを再入力"
                className="w-full px-4 py-3 border border-border rounded-lg bg-surface text-foreground text-sm placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 transition-all outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span>{submitting ? '登録中...' : '登録する'}</span>
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
