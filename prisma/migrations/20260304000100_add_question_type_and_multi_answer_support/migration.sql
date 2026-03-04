CREATE TYPE "QuestionType" AS ENUM ('SINGLE', 'MULTIPLE');

ALTER TABLE "Question"
ADD COLUMN "questionType" "QuestionType" NOT NULL DEFAULT 'SINGLE',
ADD COLUMN "answerIndices" JSONB;

ALTER TABLE "AttemptQuestion"
ADD COLUMN "selectedIndices" JSONB;

UPDATE "Question"
SET "answerIndices" = jsonb_build_array("answerIndex")
WHERE "answerIndices" IS NULL;
