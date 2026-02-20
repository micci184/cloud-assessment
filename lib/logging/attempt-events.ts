import crypto from "node:crypto";

import { getAuthSecret } from "@/lib/auth/config";

type CategoryBreakdownItem = {
  category: string;
  total: number;
  correct: number;
  percent: number;
};

export type AttemptFinalizedEvent = {
  eventType: "attempt_finalized";
  timestamp: string;
  schemaVersion: "1.0";
  attemptId: string;
  userIdHash: string;
  overallPercent: number;
  categoryBreakdown: CategoryBreakdownItem[];
};

const hashUserId = (userId: string): string => {
  return crypto
    .createHmac("sha256", getAuthSecret())
    .update(userId)
    .digest("hex");
};

export const createAttemptFinalizedEvent = (input: {
  attemptId: string;
  userId: string;
  overallPercent: number;
  categoryBreakdown: CategoryBreakdownItem[];
}): AttemptFinalizedEvent => {
  return {
    eventType: "attempt_finalized",
    timestamp: new Date().toISOString(),
    schemaVersion: "1.0",
    attemptId: input.attemptId,
    userIdHash: hashUserId(input.userId),
    overallPercent: input.overallPercent,
    categoryBreakdown: input.categoryBreakdown,
  };
};

export const logAttemptFinalizedEvent = (event: AttemptFinalizedEvent): void => {
  console.info(JSON.stringify(event));
};
