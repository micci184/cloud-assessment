# Notion Delivery

`POST /api/me/attempts/[attemptId]/deliver-notion` を実行したときに、Notion Database へ受験結果を送信します。

## Notion Database推奨カラム（Issue #42）

以下の8カラムを使った「設問単位レコード」を推奨します。

| Property Name | Type | Required | 説明 |
| --- | --- | --- | --- |
| `attempt id` | Text | Yes | Attempt識別子。同一受験の設問を束ねるキー |
| `category` | Text | Yes | 問題カテゴリ |
| `level` | Number | Yes | 難易度 |
| `questionText` | Text | Yes | 問題文 |
| `selectedChoice` | Text | Yes | ユーザーの選択肢テキスト |
| `answerChoice` | Text | Yes | 正解選択肢テキスト |
| `isCorrect` | Checkbox | Yes | 正誤 |
| `explanation` | Text | Yes | 解説 |

> 注: Notion DatabaseにはTitleプロパティが必須です。上記8カラムとは別に、Title列を1つ作成し、`NOTION_TITLE_PROPERTY_NAME`（デフォルト: `Name`）にその列名を設定してください。

## 環境変数

| Key | Required | Description |
| --- | --- | --- |
| `NOTION_API_KEY` | Yes | Notion Integration Token |
| `NOTION_DATABASE_ID` | Yes | 書き込み先Database ID |
| `NOTION_TITLE_PROPERTY_NAME` | No | NotionのTitle列プロパティ名（デフォルト: `Name`） |
| `NOTION_DELIVERY_MAX_RETRIES` | No | 再送回数（デフォルト: `3`） |
| `NOTION_DELIVERY_RETRY_DELAY_MS` | No | 初回リトライ待機時間ms（指数バックオフ） |
| `NOTION_DELIVERY_TIMEOUT_MS` | No | Notion APIタイムアウトms（デフォルト: `5000`） |

## 冪等性

- `attempt id` + `category` + `level` + `questionText` の組み合わせで重複判定
- 既存レコードがある設問はスキップし、未登録設問のみ作成

## アプリ -> Notion マッピング

- `attempt id` <- `attempt.id`
- `category` <- `question.category`
- `level` <- `question.level`
- `questionText` <- `question.questionText`
- `selectedChoice` <- `question.choices[selectedIndex]`
- `answerChoice` <- `question.choices[answerIndex]`
- `isCorrect` <- `question.isCorrect`
- `explanation` <- `question.explanation`

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
