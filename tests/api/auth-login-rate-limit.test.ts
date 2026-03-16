import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: async () => null,
    },
  },
}));

vi.mock("@/lib/api/guards", () => ({
  requireValidOrigin: () => null,
  requireJsonContentType: () => null,
}));

vi.mock("@/lib/auth/login-rate-limit", () => ({
  getLoginRateLimitKey: () => "rate-limit-key",
  checkLoginRateLimit: () => ({
    allowed: false,
    retryAfterSeconds: 30,
  }),
  registerFailedLoginAttempt: () => ({
    allowed: true,
    retryAfterSeconds: 0,
  }),
  clearLoginRateLimit: () => undefined,
}));

describe("POST /api/auth/login", () => {
  it("returns 429 and Retry-After when rate limit exceeded", async () => {
    const { POST } = await import("@/app/api/auth/login/route");

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        origin: "http://localhost",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "user@example.com",
        password: "Passw0rd!",
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(body.message).toContain("上限");
  });
});
