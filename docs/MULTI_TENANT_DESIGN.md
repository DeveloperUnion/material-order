# マルチテナント設計書

## 概要

本ドキュメントは、資材発注管理システムを複数企業に導入するためのマルチテナント設計をまとめたものです。

---

## アーキテクチャ

### 方式: シングルDB + テナントIDカラム

```
┌─────────────────────────────────────────────────┐
│                  共有PostgreSQL                  │
├─────────────────────────────────────────────────┤
│  tenants    (id, name, ...)                     │
│  users      (id, tenant_id, email, role, ...)   │
│  orders     (id, tenant_id, ...)                │
│  materials  (id, tenant_id, ...)                │
│  categories (id, tenant_id, ...)                │
└─────────────────────────────────────────────────┘
```

**選定理由:**
- 新規テナント追加がDB操作のみで完結
- 運用コストが最小
- マイグレーションが一度で済む
- 将来的にRLS（Row Level Security）で強化可能

---

## テナント識別

### 方式: ログイン時にメールアドレスで判定

共通のURL（`material-order.kensetsu-tech.com`）を使用し、ログイン時にメールアドレスからテナントを特定する。

```
material-order.kensetsu-tech.com（共通URL）
        ↓
┌─────────────────────────────────┐
│  ログイン                        │
│                                 │
│  メールアドレス                  │
│  [tanaka@oken.co.jp        ]    │
│                                 │
│  パスワード                      │
│  [••••••••                 ]    │
│                                 │
│  [ログイン]                      │
└─────────────────────────────────┘
        ↓
  users テーブルからメールで検索
  → ユーザーの tenantId でテナント特定
        ↓
  ダッシュボードへ
```

**選定理由:**
- DNS/SSL設定が不要でインフラがシンプル
- フリーメール（gmail.com等）のユーザーも対応可能
- 同じメールドメインでも別テナントに所属可能
- ローカル開発が容易

### 識別フロー

```
1. ユーザーがメールアドレス + パスワードを入力
2. users テーブルからメールアドレスで検索
3. ユーザーの tenantId からテナント情報取得
4. パスワード検証
5. セッションに userId, tenantId を保存
6. 各APIでセッションの tenantId によるフィルタリング
```

---

## データモデル

### Tenant（テナント/会社）

```prisma
model Tenant {
  id        String   @id @default(uuid())
  name      String                          // 会社名
  settings  Json?                           // ロゴURL、テーマカラー等
  isActive  Boolean  @default(true)
  max_users     INT.   //テナントごとの最大user数（契約次第）
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users       User[]
  invitations Invitation[]
  categories  Category[]
  materials   Material[]
  orders      Order[]
}
```

### User（ユーザー/従業員）

```prisma
model User {
  id          String    @id @default(uuid())
  tenantId    String
  tenant      Tenant    @relation(fields: [tenantId], references: [id])

  email       String    @unique             // グローバルで一意（ログインIDとして使用）
  password    String?                       // bcryptハッシュ（SSO時はnull）
  name        String                        // 表示名
  role        UserRole  @default(MEMBER)
  isActive    Boolean   @default(true)
  invitedAt   DateTime?                     // 招待日時
  joinedAt    DateTime?                     // 登録完了日時
  lastLoginAt DateTime?                     // 最終ログイン
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  orders      Order[]
}

enum UserRole {
  ADMIN       // 管理者（ユーザー管理、資材マスタ編集可能）
  MEMBER      // 一般（発注作成のみ）
}
```

### Invitation（招待）

```prisma
model Invitation {
  id        String    @id @default(uuid())
  tenantId  String
  tenant    Tenant    @relation(fields: [tenantId], references: [id])

  email     String    @unique              // グローバルで一意
  role      UserRole  @default(MEMBER)
  token     String    @unique              // ランダムトークン
  expiresAt DateTime                       // 有効期限（7日）
  usedAt    DateTime?                      // 使用日時
  createdBy String                         // 招待者のユーザーID
  createdAt DateTime  @default(now())
}
```

### 既存モデルへの変更

```prisma
model Category {
  id           String   @id @default(uuid())
  tenantId     String                         // 追加
  tenant       Tenant   @relation(...)        // 追加
  name         String
  displayOrder Int
  // ...

  @@unique([tenantId, name])                  // 変更: テナント内で一意
}

model Material {
  id           String   @id @default(uuid())
  tenantId     String                         // 追加
  tenant       Tenant   @relation(...)        // 追加
  materialCode String
  // ...

  @@unique([tenantId, materialCode])          // 変更: テナント内で一意
}

model Order {
  id          String   @id @default(uuid())
  tenantId    String                          // 追加
  tenant      Tenant   @relation(...)         // 追加
  orderNumber String
  // ...

  @@unique([tenantId, orderNumber])           // 変更: テナント内で一意
}
```

---

## 権限管理

### ロール定義

| ロール | 説明 |
|--------|------|
| ADMIN | 管理者。ユーザー管理、資材マスタ編集が可能 |
| MEMBER | 一般ユーザー。発注作成・編集のみ |

管理者についてはメアドとパスワードをこちらが発行、

### 権限マトリックス

| 機能 | ADMIN | MEMBER |
|------|:-----:|:------:|
| 発注作成・編集 | ✅ | ✅ |
| 発注閲覧 | ✅ | ✅ |
| 資材マスタ閲覧 | ✅ | ✅ |
| 資材マスタ編集 | ✅ | ❌ |
| カテゴリ編集 | ✅ | ❌ |
| ユーザー招待 | ✅ | ❌ |
| ユーザー編集・削除 | ✅ | ❌ |
| テナント設定 | ✅ | ❌ |

---

## 認証方式

### ログイン

```
メールアドレス + パスワード
```

```typescript
// ログイン処理の流れ
const user = await prisma.user.findUnique({
  where: {
    email: email,
    isActive: true
  },
  include: { tenant: true }
});

if (!user || !user.tenant.isActive) {
  return error("メールアドレスまたはパスワードが正しくありません");
}

const valid = await bcrypt.compare(password, user.password);
if (!valid) {
  return error("メールアドレスまたはパスワードが正しくありません");
}

// セッションに保存
session.userId = user.id;
session.tenantId = user.tenantId;
session.userName = user.name;
session.role = user.role;
```

### ユーザー登録フロー（招待制）

```
1. 管理者が従業員のメールアドレスを入力（最大user数に達している場合不可能）
              ↓
2. 招待メール送信（Resend利用）
   「○○建設からの招待です。下記リンクから登録してください」
              ↓
3. 従業員がリンクをクリック（トークン検証）
              ↓
4. 名前・パスワード設定画面
              ↓
5. 登録完了 → ダッシュボードへ
```

### 将来的な拡張（必要に応じて）

- パスワードリセット機能
- SAML SSO対応（エンタープライズ向け）
- 二要素認証（TOTP）

---

## 管理画面

### ユーザー管理画面（ADMIN専用）

```
┌──────────────────────────────────────────────────────────┐
│  ユーザー管理                            [+ ユーザー招待] │
├──────────────────────────────────────────────────────────┤
│  名前          メール              権限      状態        │
│  ─────────────────────────────────────────────────────── │
│  田中太郎      tanaka@example.com  管理者    アクティブ  │
│  山田花子      yamada@example.com  一般      アクティブ  │
│  佐藤次郎      sato@example.com    一般      招待中      │
└──────────────────────────────────────────────────────────┘
```

### 機能

- ユーザー一覧表示
- ユーザー招待（メール送信）
- ロール変更
- ユーザー無効化/削除
- 招待の再送信/取り消し

---

## セキュリティ

| 項目 | 対策 |
|------|------|
| テナント間データ漏洩 | 全クエリに`tenantId`必須 |
| パスワード保護 | bcryptハッシュ（10ラウンド） |
| セッション | httpOnly Cookie + sameSite: lax |
| 招待トークン | ランダム生成 + 有効期限（7日） |
| SQLインジェクション | Prisma ORM使用 |

### 将来的な強化（必要に応じて）

- Row Level Security (RLS) の導入
- レート制限（ブルートフォース対策）
- アカウントロック（連続失敗時）

---

## 実装ロードマップ

### Phase 1: 基盤構築

1. Tenantモデル追加
2. 既存モデルにtenantIdカラム追加
3. マイグレーション実行
4. 既存データの移行スクリプト作成・実行

### Phase 2: 認証改修

1. ログイン画面をメールベースに変更
2. メールアドレスからのテナント解決ロジック実装
3. セッションにtenantId追加
4. 全APIにテナントフィルタリング追加

### Phase 3: ユーザー管理機能

1. Invitationモデル追加
2. ユーザー管理画面（ADMIN専用）
3. 招待メール送信機能（Resend）
4. 招待リンクからの登録フロー

### Phase 4: 運用機能

1. パスワードリセット機能
2. テナント設定画面（ロゴ、会社名等）
3. 初期テナント・ユーザー作成スクリプト

---

## テナント新規追加手順（運用）

```bash
# 1. テナント作成（管理スクリプト or 管理画面）
npm run tenant:create -- --name "○○建設"

# 2. 初期管理者ユーザー作成
npm run user:create -- --tenant-id <tenant-id> --email admin@example.com --role ADMIN

# 3. 管理者に招待メール送信（自動）
# → 管理者がパスワード設定して登録完了
# → 管理者が他の従業員を招待
```

---

## 補足

### なぜOWNERロールを設けないのか

- 現時点で課金機能がない
- テナント削除のような破壊的操作がない
- シンプルな権限構造で運用しやすい
- 将来課金機能を追加する際に検討すれば十分

### テナント識別方式の比較（参考）

| 方式 | 採用 | 理由 |
|------|:----:|------|
| サブドメイン | ❌ | DNS/SSL設定が必要で運用コスト高 |
| パスプレフィックス | ❌ | URLが冗長になる |
| **ログイン時判定** | ✅ | インフラ最小、実装シンプル |
| カスタムドメイン | ❌ | 大企業向け、現時点では不要 |
