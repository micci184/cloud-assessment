# Cloud Assessment (MVP)

AWSカリキュラム向け理解度テストWebアプリのMVPです。

## 技術スタック

- Next.js (App Router) + React + TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL（docker-compose）

## セットアップ

1. 依存関係をインストール

```bash
npm install
```

2. 環境変数を作成

```bash
cp .env.example .env
```

3. PostgreSQLを起動

```bash
docker-compose up -d
```

4. Prisma Clientを生成

```bash
npm run db:generate
```

5. Seedデータを投入

```bash
npm run db:seed
```

6. 開発サーバーを起動

```bash
npm run dev
```

起動後: [http://localhost:3000](http://localhost:3000)

## 主要コマンド

```bash
npm run dev
npm run build
npm run lint
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```

## 設計ドキュメント

- [ERD (Mermaid)](./docs/erd.md)
- [OpenAPI定義](./docs/openapi.yaml)

## 初期構築で用意済みの内容（Issue #16）

- Next.js App Router + TypeScript + Tailwind の土台
- Prisma導入と `prisma/schema.prisma` 作成
- PostgreSQL用 `docker-compose.yml`
- `.env.example`
- 最低限のレイアウト/ナビゲーション雛形

## 次の実装予定

- Issue #18: Prisma schema詳細化
- Issue #19: Seedデータ投入
- Issue #20 以降: 認証/画面/API実装
