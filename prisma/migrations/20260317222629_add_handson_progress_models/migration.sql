-- CreateEnum
CREATE TYPE "HandsOnStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- DropIndex
DROP INDEX "NotionDeliveryJob_active_unique_idx";

-- CreateTable
CREATE TABLE "HandsOnProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseSlug" TEXT NOT NULL,
    "status" "HandsOnStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HandsOnProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandsOnStepProgress" (
    "id" TEXT NOT NULL,
    "progressId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HandsOnStepProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HandsOnProgress_userId_idx" ON "HandsOnProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HandsOnProgress_userId_courseSlug_key" ON "HandsOnProgress"("userId", "courseSlug");

-- CreateIndex
CREATE UNIQUE INDEX "HandsOnStepProgress_progressId_stepIndex_key" ON "HandsOnStepProgress"("progressId", "stepIndex");

-- AddForeignKey
ALTER TABLE "HandsOnProgress" ADD CONSTRAINT "HandsOnProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandsOnStepProgress" ADD CONSTRAINT "HandsOnStepProgress_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "HandsOnProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
