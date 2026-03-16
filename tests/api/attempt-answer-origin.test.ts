import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: async () => null,
    },
  },
}));

describe("POST /api/attempts/[attemptId]/answer", () => {
  it("returns 403 for invalid origin", async () => {
    const { POST } = await import("@/app/api/attempts/[attemptId]/answer/route");

    const request = new Request("http://localhost/api/attempts/attempt-1/answer", {
      method: "POST",
    });
    const response = await POST(request, {
      params: Promise.resolve({ attemptId: "attempt-1" }),
    });
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(403);
    expect(body.message).toBe("invalid origin");
  });
});
