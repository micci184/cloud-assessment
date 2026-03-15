import {
  createInMemoryRateLimiter,
  getClientIpAddress,
  type RateLimitResult,
} from "@/lib/auth/rate-limit-core";

const DEFAULT_MAX_ATTEMPTS = 60;
const DEFAULT_WINDOW_SECONDS = 60;
const DEFAULT_BLOCK_SECONDS = 300;

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
    process.env["AUTH_WRITE_RATE_LIMIT_MAX_ATTEMPTS"],
    DEFAULT_MAX_ATTEMPTS,
  );
};

const getWindowMs = (): number => {
  const seconds = parsePositiveInt(
    process.env["AUTH_WRITE_RATE_LIMIT_WINDOW_SECONDS"],
    DEFAULT_WINDOW_SECONDS,
  );
  return seconds * 1000;
};

const getBlockMs = (): number => {
  const seconds = parsePositiveInt(
    process.env["AUTH_WRITE_RATE_LIMIT_BLOCK_SECONDS"],
    DEFAULT_BLOCK_SECONDS,
  );
  return seconds * 1000;
};

const authenticatedWriteRateLimiter = createInMemoryRateLimiter({
  getMaxAttempts,
  getWindowMs,
  getBlockMs,
});

const getPathname = (request: Request): string => {
  try {
    return new URL(request.url).pathname;
  } catch {
    return "unknown";
  }
};

export const getAuthenticatedWriteRateLimitKey = (
  request: Request,
  userId: string,
): string => {
  const ipAddress = getClientIpAddress(request);
  const pathname = getPathname(request);
  return `${ipAddress}:${userId}:${pathname}`;
};

export const checkAuthenticatedWriteRateLimit = (
  key: string,
): RateLimitResult => {
  return authenticatedWriteRateLimiter.check(key);
};

export const registerAuthenticatedWriteAttempt = (
  key: string,
): RateLimitResult => {
  return authenticatedWriteRateLimiter.registerAttempt(key);
};
