type LoginRateLimitRecord = {
  failures: number;
  windowStartedAt: number;
  blockedUntil: number | null;
};

type LoginRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_SECONDS = 300;
const DEFAULT_BLOCK_SECONDS = 900;

const loginRateLimitStore = new Map<string, LoginRateLimitRecord>();

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

const normalizeIpAddress = (request: Request): string => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
};

const createRateLimitKey = (ipAddress: string, email: string): string => {
  return `${ipAddress}:${email}`;
};

const cleanupExpiredRecords = (now: number): void => {
  const ttl = Math.max(getWindowMs(), getBlockMs());

  for (const [key, record] of loginRateLimitStore.entries()) {
    const blockedExpired =
      record.blockedUntil === null || record.blockedUntil <= now;
    const windowExpired = now - record.windowStartedAt > ttl;

    if (blockedExpired && windowExpired) {
      loginRateLimitStore.delete(key);
    }
  }
};

export const getLoginRateLimitKey = (
  request: Request,
  email: string,
): string => {
  const ipAddress = normalizeIpAddress(request);
  return createRateLimitKey(ipAddress, email);
};

export const checkLoginRateLimit = (key: string): LoginRateLimitResult => {
  const now = Date.now();
  const record = loginRateLimitStore.get(key);

  if (!record) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (record.blockedUntil !== null && record.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((record.blockedUntil - now) / 1000),
    };
  }

  if (record.blockedUntil !== null && record.blockedUntil <= now) {
    loginRateLimitStore.delete(key);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return { allowed: true, retryAfterSeconds: 0 };
};

export const registerFailedLoginAttempt = (key: string): LoginRateLimitResult => {
  const now = Date.now();
  cleanupExpiredRecords(now);

  const existing = loginRateLimitStore.get(key);
  const windowMs = getWindowMs();
  const maxAttempts = getMaxAttempts();
  const blockMs = getBlockMs();

  if (!existing || now - existing.windowStartedAt > windowMs) {
    loginRateLimitStore.set(key, {
      failures: 1,
      windowStartedAt: now,
      blockedUntil: null,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const failures = existing.failures + 1;

  if (failures >= maxAttempts) {
    const blockedUntil = now + blockMs;
    loginRateLimitStore.set(key, {
      failures,
      windowStartedAt: existing.windowStartedAt,
      blockedUntil,
    });

    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(blockMs / 1000),
    };
  }

  loginRateLimitStore.set(key, {
    failures,
    windowStartedAt: existing.windowStartedAt,
    blockedUntil: null,
  });

  return { allowed: true, retryAfterSeconds: 0 };
};

export const clearLoginRateLimit = (key: string): void => {
  loginRateLimitStore.delete(key);
};
