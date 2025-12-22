// アプリ表示設定
export interface AppConfig {
  icon: string
  title: string
  appTitle: string
}

// デフォルトアプリ設定（ログイン前に表示）
export const defaultAppConfig: AppConfig = {
  icon: '/icons/icon.jpeg',
  title: '資材発注管理',
  appTitle: '資材発注管理システム',
}

// テナント設定を取得（セッションのtenantNameで上書き可能）
export function getAppConfig(tenantName?: string): AppConfig {
  if (tenantName) {
    return {
      icon: defaultAppConfig.icon,
      title: tenantName,
      appTitle: `${tenantName} - 資材発注管理システム`,
    }
  }
  return defaultAppConfig
}
