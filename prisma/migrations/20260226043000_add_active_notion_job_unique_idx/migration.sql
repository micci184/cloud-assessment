CREATE UNIQUE INDEX "NotionDeliveryJob_active_unique_idx"
ON "NotionDeliveryJob" ("attemptId", "userId")
WHERE "status" IN ('QUEUED', 'IN_PROGRESS');
