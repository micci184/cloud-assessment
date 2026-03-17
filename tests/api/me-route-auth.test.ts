import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/guards", () => ({
  getUserFromRequest: async () => null,
}));

describe("GET /api/me", () => {
  it("returns 401 when user is not authenticated", async () => {
    const { GET } = await import("@/app/api/me/route");

    const request = new Request("http://localhost/api/me", {
      method: "GET",
    });
    const response = await GET(request);
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(401);
    expect(body.message).toBe("unauthorized");
  });
});
