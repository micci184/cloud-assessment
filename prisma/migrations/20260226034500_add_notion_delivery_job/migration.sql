-- CreateEnum
CREATE TYPE "NotionDeliveryJobStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');

-- CreateTable
CREATE TABLE "NotionDeliveryJob" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "NotionDeliveryJobStatus" NOT NULL DEFAULT 'QUEUED',
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "processedQuestions" INTEGER NOT NULL DEFAULT 0,
    "successQuestions" INTEGER NOT NULL DEFAULT 0,
    "failedQuestions" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "failedItems" JSONB,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotionDeliveryJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotionDeliveryJob_attemptId_createdAt_idx" ON "NotionDeliveryJob"("attemptId", "createdAt");

-- CreateIndex
CREATE INDEX "NotionDeliveryJob_userId_status_idx" ON "NotionDeliveryJob"("userId", "status");

-- AddForeignKey
ALTER TABLE "NotionDeliveryJob" ADD CONSTRAINT "NotionDeliveryJob_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotionDeliveryJob" ADD CONSTRAINT "NotionDeliveryJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
