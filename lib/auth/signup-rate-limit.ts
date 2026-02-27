import {
  createInMemoryRateLimiter,
  getClientIpAddress,
  type RateLimitResult,
} from "@/lib/auth/rate-limit-core";

const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_WINDOW_SECONDS = 300;
const DEFAULT_BLOCK_SECONDS = 900;

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const getMaxAttempts = (): number => {
  return parsePositiveInt(
    process.env["SIGNUP_RATE_LIMIT_MAX_ATTEMPTS"],
    DEFAULT_MAX_ATTEMPTS,
  );
};

const getWindowMs = (): number => {
  const seconds = parsePositiveInt(
    process.env["SIGNUP_RATE_LIMIT_WINDOW_SECONDS"],
    DEFAULT_WINDOW_SECONDS,
  );
  return seconds * 1000;
};

const getBlockMs = (): number => {
  const seconds = parsePositiveInt(
    process.env["SIGNUP_RATE_LIMIT_BLOCK_SECONDS"],
    DEFAULT_BLOCK_SECONDS,
  );
  return seconds * 1000;
};

const signupRateLimiter = createInMemoryRateLimiter({
  getMaxAttempts,
  getWindowMs,
  getBlockMs,
});

export const getSignupRateLimitKey = (request: Request): string => {
  return getClientIpAddress(request);
};

export const checkSignupRateLimit = (key: string): RateLimitResult => {
  return signupRateLimiter.check(key);
};

export const registerSignupAttempt = (key: string): RateLimitResult => {
  return signupRateLimiter.registerAttempt(key);
};
