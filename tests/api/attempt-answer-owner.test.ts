import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/guards", () => ({
  requireValidOrigin: () => null,
  requireJsonContentType: () => null,
  requireAuthenticatedUser: async () => ({
    user: {
      id: "user-1",
      email: "user@example.com",
      tokenVersion: 1,
    },
    response: null,
  }),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    attempt: {
      findUnique: async () => ({
        userId: "another-user",
        status: "IN_PROGRESS",
      }),
    },
  },
}));

describe("POST /api/attempts/[attemptId]/answer", () => {
  it("returns 403 when attempt owner is different", async () => {
    const { POST } = await import("@/app/api/attempts/[attemptId]/answer/route");

    const request = new Request("http://localhost/api/attempts/attempt-1/answer", {
      method: "POST",
      headers: {
        origin: "http://localhost",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        attemptQuestionId: "aq-1",
        selectedIndex: 0,
      }),
    });
    const response = await POST(request, {
      params: Promise.resolve({ attemptId: "attempt-1" }),
    });
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(403);
    expect(body.message).toBe("forbidden");
  });
});
