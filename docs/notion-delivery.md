# Notion Delivery

`POST /api/attempts/[attemptId]/finalize` 成功時に、Notion Database へ受験結果を送信します。

## 環境変数

| Key | Required | Description |
| --- | --- | --- |
| `NOTION_API_KEY` | Yes | Notion Integration Token |
| `NOTION_DATABASE_ID` | Yes | 書き込み先Database ID |
| `NOTION_DELIVERY_MAX_RETRIES` | No | 再送回数（デフォルト: `3`） |
| `NOTION_DELIVERY_RETRY_DELAY_MS` | No | 初回リトライ待機時間ms（指数バックオフ） |
| `NOTION_DELIVERY_TIMEOUT_MS` | No | Notion APIタイムアウトms（デフォルト: `5000`） |

## 冪等性

- `Attempt ID` をキーとして、送信前に `databases/{id}/query` を実行
- 既存ページが見つかった場合は新規作成せず `duplicate=true` として扱う

## 再送

- 429 および 5xx を再送対象とする
- 指数バックオフで再試行する（`delay * 2^(attempt-1)`）

## ログ

送信結果を `notion_delivery_result` としてJSONログに出力します。

```json
{
  "eventType": "notion_delivery_result",
  "attemptId": "cm7example123",
  "status": "sent",
  "attempts": 1,
  "duplicate": false
}
```
