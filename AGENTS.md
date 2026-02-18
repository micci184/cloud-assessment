# AGENTS.md

## 目的

このリポジトリは、AWSカリキュラム向け理解度テストWebアプリのMVPを実装するための開発ガイドです。  
MVPのゴールは「ログイン → 問題選択 → 受験 → 採点結果/履歴確認」を一貫して動作させることです。

## 技術スタック

- Next.js (App Router) + React + TypeScript
- Tailwind CSS（ダークモード対応）
- PostgreSQL（docker-compose）
- Prisma ORM
- ローカル認証（メール+パスワード）
  - bcryptでハッシュ化
  - 署名付きHTTP-only Cookie（7日）

## 実装スコープ

- 対象ページ
  - `/login`
  - `/select`
  - `/quiz/[attemptId]`
  - `/me`
- 対象API（POST: 書き込み系）
  - `POST /api/auth/signup`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `POST /api/attempts/create`
  - `POST /api/attempts/[attemptId]/answer`
  - `POST /api/attempts/[attemptId]/finalize`
- 対象API（GET: 読み取り系）
  - `GET /api/questions/categories`
  - `GET /api/attempts/[attemptId]`
  - `GET /api/me`
  - `GET /api/me/attempts`
  - `GET /api/me/attempts/[attemptId]`
- 対象データモデル
  - `User`
  - `Question`
  - `Attempt`
  - `AttemptQuestion`
  - `Result`

## 非スコープ（MVPでは実装しない）

- 管理画面
- 問題編集UI
- 外部SaaS依存
- Cognito本体の導入（将来置換できる設計だけ担保）

## アーキテクチャ原則

1. 認証境界を `lib/auth/*` に集約する
   - ページ/APIは `requireUser()` など抽象に依存
2. 書き込み処理は Route Handlers (`app/api/*`) で統一
3. バリデーションは Zod を利用
4. DBアクセスは Prisma Client をシングルトン化

## セキュリティ要件（必須）

- パスワードは平文保存禁止（bcryptハッシュ）
- Cookie属性
  - `HttpOnly: true`
  - `SameSite: Lax`
  - `Path: /`
  - `Secure: production only`
  - `Max-Age: 7 days`
- 状態変更API（POST）はOriginチェックを実施
- Attempt更新系は必ず所有者チェック（`attempt.userId === currentUser.id`）

## 実装順（依存順）

1. 初期構築
2. Prisma schema/migration
3. Seed投入
4. Auth基盤
5. `/login`
6. `/select` + Attempt生成
7. `/quiz/[attemptId]` + 採点
8. `/me`
9. セキュリティ最終確認 + README

## ローカル実行

1. `.env` を作成（`DATABASE_URL`, `AUTH_SECRET`）
2. `docker-compose up -d`
3. `npm i`
4. `npx prisma migrate dev`
5. `npx prisma db seed`
6. `npm run dev`

## 将来Cognitoへ置換する際の方針

- 差し替え対象は `lib/auth/*` を中心に限定する
- 既存ページ/API層には認証実装の詳細を漏らさない
- `User` と外部ID (`sub`) のマッピング戦略を明示する
