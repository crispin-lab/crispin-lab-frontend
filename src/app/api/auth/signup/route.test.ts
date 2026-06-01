import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";

const cookieSet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: cookieSet,
    delete: vi.fn(),
  })),
}));

const BACKEND_URL = "https://backend.test";
const VALID_TOKEN = "sess_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ";

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.stubEnv("BACKEND_URL", BACKEND_URL);
    cookieSet.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("/v1/users 로 프록시하고 cookie 발급 + { ok: true } 반환", async () => {
    const upstreamHandler = vi.fn(() =>
      HttpResponse.json({ userId: "42", token: VALID_TOKEN }, { status: 201 }),
    );
    server.use(http.post(`${BACKEND_URL}/v1/users`, upstreamHandler));

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "a@b.com", handle: "alice", password: "password1" }),
      }),
    );

    expect(upstreamHandler).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(cookieSet).toHaveBeenCalledWith(
      expect.objectContaining({ name: "session", value: VALID_TOKEN }),
    );
  });
});
