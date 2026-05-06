// Vercel は TZ を予約 env として禁止しているため、サーバープロセス起動時に明示設定する。
export async function register() {
  process.env.TZ = 'Asia/Tokyo'
}
