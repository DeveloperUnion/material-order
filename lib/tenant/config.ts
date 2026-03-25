// アプリ表示設定
export interface AppConfig {
  icon: string
  title: string
  appTitle: string
}

// デフォルトアプリ設定（ログイン前に表示）
export const defaultAppConfig: AppConfig = {
  icon: '/icons/icon.jpeg',
  title: 'スマート資材発注',
  appTitle: 'スマート資材発注',
}

// テナント設定を取得（セッションのtenantNameで上書き可能）
export function getAppConfig(tenantName?: string): AppConfig {
  if (tenantName) {
    return {
      icon: defaultAppConfig.icon,
      title: tenantName,
      appTitle: `${tenantName} - スマート資材発注`,
    }
  }
  return defaultAppConfig
}
