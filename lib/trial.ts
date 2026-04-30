// 無料トライアル状態の判定。Tenant.trialEndsAt の単純なラッパー。
// サーバー / クライアント両方から使う。Date と string (ISO) どちらでも受け取れる。

export type TrialStatus =
  | { kind: 'NOT_TRIAL' } // 本契約 (trialEndsAt が null)
  | { kind: 'ACTIVE'; endsAt: Date; daysLeft: number } // トライアル中
  | { kind: 'EXPIRED'; endsAt: Date } // 期限切れ

export function getTrialStatus(
  trialEndsAt: Date | string | null | undefined,
  now: Date = new Date()
): TrialStatus {
  if (!trialEndsAt) return { kind: 'NOT_TRIAL' }
  const endsAt = typeof trialEndsAt === 'string' ? new Date(trialEndsAt) : trialEndsAt
  if (endsAt.getTime() <= now.getTime()) {
    return { kind: 'EXPIRED', endsAt }
  }
  // 「残り日数」は切り上げ。残り 0.1 日でも UI は「残り 1 日」と表示したい。
  const ms = endsAt.getTime() - now.getTime()
  const daysLeft = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)))
  return { kind: 'ACTIVE', endsAt, daysLeft }
}
