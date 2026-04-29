// パスベース・マルチテナントで Tenant.code として使えない予約語。
// 追加する時は middleware の routing と root レベルの page / API を確認すること。
export const RESERVED_TENANT_CODES = new Set<string>([
  'api',
  '_next',
  'invite',
  'super-admin',
  'super-admin-login',
  'auth',
  'login',
  'logout',
  'signup',
  'register',
  'admin',
  'dashboard',
  'public',
  'static',
  'assets',
  'favicon.ico',
])

export function isReservedTenantCode(code: string): boolean {
  return RESERVED_TENANT_CODES.has(code.toLowerCase())
}
