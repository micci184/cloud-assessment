import {
  createInMemoryRateLimiter,
  getClientIpAddress,
  type RateLimitResult,
} from "@/lib/auth/rate-limit-core";

const DEFAULT_MAX_ATTEMPTS = 5;
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
    process.env["LOGIN_RATE_LIMIT_MAX_ATTEMPTS"],
    DEFAULT_MAX_ATTEMPTS,
  );
};

const getWindowMs = (): number => {
  const seconds = parsePositiveInt(
    process.env["LOGIN_RATE_LIMIT_WINDOW_SECONDS"],
    DEFAULT_WINDOW_SECONDS,
  );
  return seconds * 1000;
};

const getBlockMs = (): number => {
  const seconds = parsePositiveInt(
    process.env["LOGIN_RATE_LIMIT_BLOCK_SECONDS"],
    DEFAULT_BLOCK_SECONDS,
  );
  return seconds * 1000;
};

const createRateLimitKey = (ipAddress: string, email: string): string => {
  return `${ipAddress}:${email}`;
};

const loginRateLimiter = createInMemoryRateLimiter({
  getMaxAttempts,
  getWindowMs,
  getBlockMs,
});

export const getLoginRateLimitKey = (
  request: Request,
  email: string,
): string => {
  const ipAddress = getClientIpAddress(request);
  return createRateLimitKey(ipAddress, email);
};

export const checkLoginRateLimit = (key: string): RateLimitResult => {
  return loginRateLimiter.check(key);
};

export const registerFailedLoginAttempt = (key: string): RateLimitResult => {
  return loginRateLimiter.registerAttempt(key);
};

export const clearLoginRateLimit = (key: string): void => {
  loginRateLimiter.clear(key);
};
