UPDATE "Question"
SET "answerIndices" = jsonb_build_array("answerIndex")
WHERE "answerIndices" IS NULL;

UPDATE "AttemptQuestion"
SET "selectedIndices" = jsonb_build_array("selectedIndex")
WHERE "selectedIndex" IS NOT NULL
  AND "selectedIndices" IS NULL;

ALTER TABLE "AttemptQuestion"
DROP COLUMN "selectedIndex";

ALTER TABLE "Question"
DROP COLUMN "answerIndex";
