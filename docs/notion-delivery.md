# Notion Delivery

`POST /api/me/attempts/[attemptId]/deliver-notion` を実行したときに、Notion Database へ受験結果を送信します。

## Notion Database推奨カラム（Issue #42）

以下のプロパティ名・型でDatabaseを作成してください。

| Property Name | Type | Required | 説明 |
| --- | --- | --- | --- |
| `Attempt ID` | Title | Yes | Attemptの一意キー（冪等判定に使用） |
| `User Hash` | Rich text | Yes | userIdをハッシュ化した識別子 |
| `Status` | Select (`IN_PROGRESS`, `COMPLETED`) | Yes | Attempt状態 |
| `Overall %` | Number | Yes | 総合正答率 |
| `Started At` | Date | Yes | 受験開始日時 |
| `Completed At` | Date | No | 受験完了日時 |
| `Categories` | Multi-select | Yes | 出題カテゴリ一覧 |
| `Category Breakdown JSON` | Rich text | Yes | カテゴリ別正答率のJSON |
| `Questions JSON` | Rich text | Yes | 設問ごとの詳細JSON |
| `Source` | Select (`app`, `replay`, `manual`) | Yes | 送信元 |
| `Schema Version` | Rich text | Yes | スキーマバージョン（例: `1.0`） |
| `Created At (App)` | Date | Yes | Attempt作成日時 |
| `Updated At (App)` | Date | Yes | Attempt更新日時 |

> 注: `Questions JSON` / `Category Breakdown JSON` はNotionの文字数制限に合わせて先頭2,000文字まで保存されます。

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

## アプリ -> Notion マッピング

- `Attempt ID` <- `attempt.id`
- `User Hash` <- `createAttemptFinalizedEvent(...).userIdHash`
- `Status` <- `attempt.status`
- `Overall %` <- `result.overallPercent`
- `Started At` <- `attempt.startedAt`
- `Completed At` <- `attempt.completedAt`
- `Categories` <- `attempt.filters.categories`
- `Category Breakdown JSON` <- `result.categoryBreakdown`
- `Questions JSON` <- `attempt.questions`（order/category/level/questionText/choices/answerIndex/selectedIndex/isCorrect/explanation）
- `Source` <- 固定値 `app`（将来 `replay` / `manual` を想定）
- `Schema Version` <- `createAttemptFinalizedEvent(...).schemaVersion`
- `Created At (App)` <- `attempt.createdAt`
- `Updated At (App)` <- `attempt.updatedAt`

## 再送

- 429 および 5xx を再送対象とする
- 指数バックオフで再試行する（`delay * 2^(attempt-1)`）

## 送信トリガー

- 自動送信は行わない
- `/me` 画面の「Notionへ送信」操作で対象Attemptのみ送信する

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
