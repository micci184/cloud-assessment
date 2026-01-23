This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## DynamoDB Local (Docker)

ローカルテスト用に、AWS 公式の DynamoDB Local イメージ（`amazon/dynamodb-local`）を Docker Compose で起動できます。

### 起動 / 停止

```bash
docker compose -f compose.dynamodb-local.yml up -d
docker compose -f compose.dynamodb-local.yml ps

# 停止
docker compose -f compose.dynamodb-local.yml down
```

### 疎通確認（AWS CLI）

事前に AWS CLI をインストールしている前提です。

```bash
aws dynamodb list-tables --endpoint-url http://localhost:8000 --region ap-northeast-1
```

必要ならテーブル作成もできます:

```bash
aws dynamodb create-table \
  --endpoint-url http://localhost:8000 \
  --region ap-northeast-1 \
  --table-name ExampleTable \
  --attribute-definitions AttributeName=pk,AttributeType=S \
  --key-schema AttributeName=pk,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### アプリからの接続先

アプリ側の AWS SDK 設定で `endpoint` を `http://localhost:8000` に向けてください（例: 環境変数 `DYNAMODB_ENDPOINT_URL=http://localhost:8000` など）。

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
