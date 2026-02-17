# ERD (MVP)

このERDは `prisma/schema.prisma` と整合するMVP向けデータモデルです。

```mermaid
erDiagram
  User ||--o{ Attempt : has
  Attempt ||--o{ AttemptQuestion : contains
  Question ||--o{ AttemptQuestion : appears_in
  Attempt ||--o| Result : has

  User {
    string id PK
    string email UK
    string passwordHash
    int tokenVersion
    datetime createdAt
    datetime updatedAt
  }

  Question {
    string id PK
    string category
    int level
    string questionText
    json choices
    int answerIndex
    string explanation
    datetime createdAt
    datetime updatedAt
  }

  Attempt {
    string id PK
    string userId FK
    json filters
    string status
    datetime startedAt
    datetime completedAt
    datetime createdAt
    datetime updatedAt
  }

  AttemptQuestion {
    string id PK
    string attemptId FK
    string questionId FK
    int order
    int selectedIndex
    boolean isCorrect
    datetime answeredAt
    datetime createdAt
    datetime updatedAt
  }

  Result {
    string id PK
    string attemptId UK_FK
    float overallPercent
    json categoryBreakdown
    datetime createdAt
  }
```

## 補足
- `Attempt.status` は `IN_PROGRESS` / `COMPLETED`
- `AttemptQuestion` は以下の複合ユニーク制約を持つ
  - `(attemptId, order)`
  - `(attemptId, questionId)`
- `Result.attemptId` は一意（1 Attempt : 0..1 Result）
