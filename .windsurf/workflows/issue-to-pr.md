---
auto_execution_mode: 0
description: Confirm specs, check GitHub issue, implement, commit, and create PR
---
このワークフローは「仕様確認 → GitHub Issue確認 → 実装 → コミット → PR作成」を一気通貫で進めるための手順です。

1. 仕様確認（必須）
- まずユーザー要求を要約し、目的・受け入れ条件・スコープ・制約を明文化する。
- 不明点がある場合は必ず先に質問する。
- 既存ルールを確認する。
  - `AGENTS.md`
  - `.windsurf/rules/rules.md`

2. 対象Issue確認（GitHub MCP）
- 対象Issue番号が指定されている場合はIssue詳細を取得する。
- 指定がない場合は、Open Issue一覧から着手対象をユーザーと合意する。
- 必要ならIssueコメントや関連PRも確認して、期待実装を確定する。

3. 実装計画の提示
- 変更ファイル、実装方針、テスト方針を短く提示する。
- 破壊的変更や仕様変更がある場合は実装前に確認を取る。

4. 実装
- 既存構成に従って最小変更で実装する。
- ルールに従うこと:
  - TypeScript中心
  - 入力検証はZod
  - 書き込み系APIはPOST
  - 認証は `lib/auth/*` 境界を維持
- 必要に応じてテストを追加/更新する。

5. ローカル検証
- 型チェック・Lint・テスト・ビルドのうち、影響範囲に必要なものを実行する。
- 実行コマンドと結果を記録する。
- 失敗時は原因を修正して再検証する。

6. 変更内容サマリ作成
- 以下を簡潔に整理する:
  - 目的
  - 主要変更点
  - テスト/動作確認結果
  - 影響範囲

7. コミット
- 変更を確認して、意味のある単位でコミットする。
- コミットメッセージは Conventional Commits 推奨。
  - 例: `feat(auth): add signed cookie session validation`

8. Pull Request作成（GitHub MCP）
- 対象ブランチからPRを作成する。
- PR本文には必ず以下を含める:
  - 目的
  - 変更内容
  - 動作確認手順
  - 未対応事項（あれば）
- Issueに紐づく場合は本文に `Closes #<issue_number>` を含める。

9. 最終報告
- ユーザーに以下を共有する:
  - 実装概要
  - 実行した検証
  - コミットSHA
  - PR URL
  - 残課題（あれば）
