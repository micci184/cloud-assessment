# Cloud Assessment (MVP)

AWSカリキュラム向け理解度テストWebアプリのMVPです。  
「ログイン → 問題条件選択 → 受験 → 採点結果/履歴確認」を一貫して動作させます。

## 技術スタック

- **フレームワーク**: Next.js (App Router) + React + TypeScript
- **スタイリング**: Tailwind CSS（ダークモード対応）
- **ORM**: Prisma 7
- **DB**: PostgreSQL（docker-compose）
- **認証**: ローカル認証（bcrypt + 署名付きHTTP-only Cookie、7日有効）
- **バリデーション**: Zod

## セットアップ

### 前提条件

- Node.js 20+
- Docker / Docker Compose

### 手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/micci184/cloud-assessment.git
cd cloud-assessment

# 2. 依存関係をインストール
npm install

# 3. 環境変数を作成
cp .env.example .env
# .env の DATABASE_URL と AUTH_SECRET を確認・編集

# 4. PostgreSQLを起動
docker-compose up -d

# 5. マイグレーション実行
npm run db:migrate

# 6. Seedデータを投入（AWS 8カテゴリ × 3レベル = 24問）
npm run db:seed

# 7. 開発サーバーを起動
npm run dev
```

起動後: [http://localhost:3000](http://localhost:3000)

## 動作確認手順

1. `/login` でアカウント作成（新規登録）
2. `/select` でカテゴリ・レベル・問題数を選択し「テストを開始」
3. `/quiz/[attemptId]` で1問ずつ回答 → 全問回答後「採点する」
4. 結果画面で総合正答率・カテゴリ別正答率・解説を確認
5. `/me` で受験履歴・弱点カテゴリ・間違い問題一覧を確認

## 画面一覧

| パス                | 認証 | 説明                                         |
| ------------------- | ---- | -------------------------------------------- |
| `/login`            | 不要 | ログイン / サインアップ                      |
| `/select`           | 必要 | 問題条件選択 + Attempt生成                   |
| `/quiz/[attemptId]` | 必要 | クイズ進行（1問ずつ回答 → 採点）             |
| `/me`               | 必要 | マイページ（履歴・スコア・弱点・間違い問題） |

## API一覧

### 認証

| メソッド | パス               | 説明               |
| -------- | ------------------ | ------------------ |
| POST     | `/api/auth/signup` | アカウント作成     |
| POST     | `/api/auth/login`  | ログイン           |
| POST     | `/api/auth/logout` | ログアウト         |
| GET      | `/api/me`          | 現在のユーザー情報 |

### クイズ

| メソッド | パス                                 | 説明         |
| -------- | ------------------------------------ | ------------ |
| GET      | `/api/questions/categories`          | カテゴリ一覧 |
| POST     | `/api/attempts/create`               | Attempt生成  |
| GET      | `/api/attempts/[attemptId]`          | Attempt詳細  |
| POST     | `/api/attempts/[attemptId]/answer`   | 回答送信     |
| POST     | `/api/attempts/[attemptId]/finalize` | 採点確定     |

### マイページ

| メソッド | パス                           | 説明         |
| -------- | ------------------------------ | ------------ |
| GET      | `/api/me/attempts`             | 受験履歴一覧 |
| GET      | `/api/me/attempts/[attemptId]` | 受験履歴詳細 |

## セキュリティ

- **パスワード**: bcryptハッシュ（平文保存禁止）
- **Cookie**: `HttpOnly`, `SameSite=Lax`, `Secure`(本番), `Path=/`, 7日有効
- **CSRF対策**: 全POST APIでOriginチェック + JSON Content-Type限定
- **所有者検証**: Attempt更新系APIで `attempt.userId === currentUser.id` を必須チェック
- **入力検証**: Zodによるサーバーサイドバリデーション

## 主要コマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # プロダクションビルド
npm run lint         # ESLint実行
npm run db:generate  # Prisma Client生成
npm run db:migrate   # マイグレーション実行
npm run db:seed      # Seedデータ投入
npm run db:studio    # Prisma Studio起動
```

## 設計ドキュメント

- [ERD (Mermaid)](./docs/erd.md)
- [OpenAPI定義](./docs/openapi.yaml)
- [イベントログ仕様](./docs/event-logging.md)

## 既知の制約

- 管理画面・問題編集UIは未実装（Seedデータのみ）
- 外部SaaS連携なし
- 本番向け運用最適化（監視/可観測性）は未実装
- セッションはステートレス（DB側での即時無効化はtokenVersionで対応可能）

## 将来のCognito置換について

認証ロジックは `lib/auth/*` に集約されており、以下の差し替えで移行可能です。

| 現在                   | Cognito置換後                                      |
| ---------------------- | -------------------------------------------------- |
| `lib/auth/password.ts` | Cognito User Pool が担当（削除可）                 |
| `lib/auth/session.ts`  | Cognito ID Token / Access Token に置換             |
| `lib/auth/cookie.ts`   | トークン格納方式を変更                             |
| `lib/auth/guards.ts`   | `requireUser()` 内でCognitoトークン検証に変更      |
| `User.passwordHash`    | 不要に（Cognito `sub` とのマッピングカラムを追加） |

**差し替え対象は `lib/auth/*` を中心に限定**し、ページ/API層には認証実装の詳細を漏らさない設計です。
