# Event Logging Schema

`POST /api/attempts/[attemptId]/finalize` が成功したとき、構造化JSONイベントを1件出力します。

## Event Type

- `attempt_finalized`

## Schema Version

- `1.0`

## Fields

| Field | Type | Description |
| --- | --- | --- |
| `eventType` | `"attempt_finalized"` | イベント種別 |
| `timestamp` | `string (ISO 8601)` | イベント生成時刻（UTC） |
| `schemaVersion` | `"1.0"` | スキーマバージョン |
| `attemptId` | `string` | 受験ID |
| `userIdHash` | `string` | HMAC-SHA256で匿名化したユーザー識別子 |
| `overallPercent` | `number` | 総合正答率 |
| `categoryBreakdown` | `array` | カテゴリ別正答率 |

`categoryBreakdown` の要素:

| Field | Type | Description |
| --- | --- | --- |
| `category` | `string` | カテゴリ名 |
| `total` | `number` | 出題数 |
| `correct` | `number` | 正答数 |
| `percent` | `number` | 正答率 |

## Example

```json
{
  "eventType": "attempt_finalized",
  "timestamp": "2026-02-19T10:00:00.000Z",
  "schemaVersion": "1.0",
  "attemptId": "cm7example123",
  "userIdHash": "00ab11cd22ef33...",
  "overallPercent": 66.7,
  "categoryBreakdown": [
    {
      "category": "VPC",
      "total": 3,
      "correct": 2,
      "percent": 66.7
    },
    {
      "category": "IAM",
      "total": 3,
      "correct": 2,
      "percent": 66.7
    }
  ]
}
```
