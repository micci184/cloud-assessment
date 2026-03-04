# Cloud Practitioner Phase 0 仕様（Issue #131）

本ドキュメントは、以下を実装するための仕様確定版です。

- 単一選択（single）+ 複数選択（multiple）対応
- Cloud Practitioner 専用モードの追加
- 既存フローを維持した段階導入

Parent Issue: #130  
Phase Issue: #131

## 1. スコープ

### 1-1. 対象

- 問題タイプ定義
- 採点仕様
- Cloud Practitioner 専用モードの出題条件
- UI 要件（可読性・操作性・アクセシビリティ）
- API 入出力契約（Phase 2 の実装前提）

### 1-2. 非対象

- 本番試験そのものとの完全一致保証
- 記述式問題（Issue #123）
- 旧カラムの撤去（Phase 4）

## 2. 問題タイプ定義

## 2-1. 種別

- `single`: 正解は1つ
- `multiple`: 正解は2つ以上

## 2-2. DB モデル方針（Phase 1 で追加）

後方互換を維持するため、既存カラムは残したまま新規カラムを追加する。

- `Question`
  - 追加: `questionType`（`SINGLE` / `MULTIPLE`）
  - 追加: `answerIndices`（正解インデックス配列）
  - 既存: `answerIndex` は当面維持
- `AttemptQuestion`
  - 追加: `selectedIndices`（回答インデックス配列）
  - 既存: `selectedIndex` は当面維持

## 2-3. インデックス値ルール

- すべて 0-based index
- `choices` の範囲外インデックスは不正入力として 400 を返す
- `multiple` で重複インデックスはサーバー側で重複排除して判定する

## 3. 採点仕様

## 3-1. 単一選択（single）

- 判定: `selectedIndex === answerIndex`
- 既存ロジック互換

## 3-2. 複数選択（multiple）

- 判定: 完全一致（集合一致）方式
  - 正解集合 `answerIndices`
  - 回答集合 `selectedIndices`
  - 要素数と要素内容が一致した場合のみ正解
- 部分点は付与しない

採点の一貫性と実装の明確性を優先し、部分点は将来検討とする。

## 4. Cloud Practitioner 専用モード要件

## 4-1. 導線

- 既存の `/select`（通常モード）は維持
- 別導線として Cloud Practitioner 専用開始 UI を追加（Phase 3）

## 4-2. v1 出題条件

- 対象カテゴリ: `VPC`, `EC2`, `S3`, `IAM`, `CloudWatch`, `CloudTrail`, `RDS`, `Lambda`
- レベル: `1-3` を混在可（Phase 2 で API が対応）
- 問題数:
  - 初期値: 30
  - 選択肢: 10 / 20 / 30 / 40 / 50
  - 上限 65 は問題プール拡充後に検討
- 時間制限: v1 では未導入（将来拡張）

## 4-3. Attempt フィルタ保存

`Attempt.filters` に専用モード情報を保存する。

例:

```json
{
  "preset": "cloud-practitioner",
  "categories": ["VPC", "EC2", "S3", "IAM", "CloudWatch", "CloudTrail", "RDS", "Lambda"],
  "levels": [1, 2, 3],
  "count": 30
}
```

## 5. API 契約（Phase 2 実装前提）

## 5-1. Attempt 詳細取得（GET）

問題項目に以下を追加:

- `questionType`: `"SINGLE" | "MULTIPLE"`
- `selectedIndices`: `number[] | null`

## 5-2. 回答保存（POST /answer）

受け付ける入力:

- 既存互換: `selectedIndex: number`
- 新方式: `selectedIndices: number[]`

バリデーション:

- `SINGLE`: 有効な選択肢を1つのみ
- `MULTIPLE`: 1つ以上、重複なし、範囲内

## 5-3. finalize（採点）

- `questionType` に応じて single / multiple を分岐採点
- 返却形式（overallPercent / categoryBreakdown）は維持

## 6. UI 要件（Phase 3）

## 6-1. 見やすさ

- 問題文と選択肢をカード化し、視線移動を減らす
- 選択状態を色・枠線・テキストで明確化
- 現在位置（例: `3 / 30`）を常時表示

## 6-2. 操作性

- `single`: 1選択で即時状態更新
- `multiple`: 複数トグル可能、送信前に最終状態が明確
- 「次へ/戻る」導線を固定配置
- モバイルで押しやすいタップ領域（44px 以上）を確保

## 6-3. アクセシビリティ

- キーボードのみで回答操作可能
- フォーカス可視化を担保
- エラーは `role="alert"` で通知
- ローディング/状態変化は `aria-live` で通知

## 7. 段階導入と互換性

- Phase 1: DB 拡張（既存カラム維持）
- Phase 2: API 両対応（旧/新入力を受付）
- Phase 3: UI 切替・専用導線追加
- Phase 4: 旧カラム整理（安定確認後）

破壊的変更は行わず、Expand-Migrate-Contract で移行する。

## 8. 未決事項（次Phase開始前に確認）

- Cloud Practitioner v1 の問題数初期値を 30 で確定するか
- `multiple` の最小選択数を「1」から「2」にするか
- 将来の部分点導入可否（今回は非対応）

