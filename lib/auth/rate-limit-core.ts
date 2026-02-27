type RateLimitRecord = {
  attempts: number;
  windowStartedAt: number;
  blockedUntil: number | null;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type CreateInMemoryRateLimiterOptions = {
  getMaxAttempts: () => number;
  getWindowMs: () => number;
  getBlockMs: () => number;
};

const createRateLimitStore = () => {
  return new Map<string, RateLimitRecord>();
};

const cleanupExpiredRecords = (
  store: Map<string, RateLimitRecord>,
  now: number,
  ttlMs: number,
): void => {
  for (const [key, record] of store.entries()) {
    const blockedExpired =
      record.blockedUntil === null || record.blockedUntil <= now;
    const windowExpired = now - record.windowStartedAt > ttlMs;

    if (blockedExpired && windowExpired) {
      store.delete(key);
    }
  }
};

export const createInMemoryRateLimiter = (
  options: CreateInMemoryRateLimiterOptions,
) => {
  const store = createRateLimitStore();

  const check = (key: string): RateLimitResult => {
    const now = Date.now();
    const record = store.get(key);

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
      store.delete(key);
      return { allowed: true, retryAfterSeconds: 0 };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  };

  const registerAttempt = (key: string): RateLimitResult => {
    const now = Date.now();
    const windowMs = options.getWindowMs();
    const maxAttempts = options.getMaxAttempts();
    const blockMs = options.getBlockMs();
    const ttl = Math.max(windowMs, blockMs);

    cleanupExpiredRecords(store, now, ttl);

    const existing = store.get(key);

    if (!existing || now - existing.windowStartedAt > windowMs) {
      store.set(key, {
        attempts: 1,
        windowStartedAt: now,
        blockedUntil: null,
      });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const attempts = existing.attempts + 1;
    if (attempts >= maxAttempts) {
      const blockedUntil = now + blockMs;
      store.set(key, {
        attempts,
        windowStartedAt: existing.windowStartedAt,
        blockedUntil,
      });
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(blockMs / 1000),
      };
    }

    store.set(key, {
      attempts,
      windowStartedAt: existing.windowStartedAt,
      blockedUntil: null,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  };

  const clear = (key: string): void => {
    store.delete(key);
  };

  return {
    check,
    registerAttempt,
    clear,
  };
};

export const getClientIpAddress = (request: Request): string => {
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
