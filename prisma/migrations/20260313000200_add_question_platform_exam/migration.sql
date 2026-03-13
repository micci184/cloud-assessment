ALTER TABLE "Question"
ADD COLUMN "platform" TEXT NOT NULL DEFAULT 'AWS',
ADD COLUMN "exam" TEXT NOT NULL DEFAULT 'CP';

DROP INDEX IF EXISTS "Question_category_level_idx";

CREATE INDEX "Question_platform_exam_category_level_idx"
ON "Question" ("platform", "exam", "category", "level");
