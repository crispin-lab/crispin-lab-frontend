import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { sessionCookieOptions } from "@/lib/auth/session";

// 백엔드 contract: POST /v1/sessions → 200 + { sessionToken: "sess_<43-base64>" }.
const SESSION_TOKEN_PATTERN = /^sess_[A-Za-z0-9_-]{43}$/;

const UPSTREAM_TIMEOUT_MS = 5_000;

export async function POST(request: Request): Promise<Response> {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    return NextResponse.json(
      { code: "BFF_MISCONFIGURED", message: "요청을 처리하지 못했습니다." },
      { status: 500 },
    );
  }

  const requestBody = await request.text();
  if (requestBody === "") {
    return NextResponse.json(
      { code: "BFF_EMPTY_BODY", message: "요청을 처리하지 못했습니다." },
      { status: 400 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${backendUrl.replace(/\/$/, "")}/v1/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "TimeoutError";
    console.error("[auth/login] upstream fetch 실패", {
      reason: isTimeout ? "timeout" : "network",
    });
    return NextResponse.json(
      { code: "BFF_UPSTREAM_UNAVAILABLE", message: "요청을 처리하지 못했습니다." },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: { "content-type": contentType },
    });
  }

  const upstreamBody = await upstream.text();
  const sessionToken = extractSessionToken(upstreamBody);
  if (!sessionToken) {
    console.error("[auth/login] 백엔드 응답에서 sessionToken 을 추출하지 못했습니다.", {
      length: upstreamBody.length,
    });
    return NextResponse.json(
      { code: "BFF_UNEXPECTED_RESPONSE", message: "요청을 처리하지 못했습니다." },
      { status: 502 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieOptions(sessionToken));

  return NextResponse.json({ ok: true });
}

function extractSessionToken(text: string): string | null {
  if (text === "") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const value = (parsed as Record<string, unknown>).sessionToken;
  if (typeof value !== "string") return null;
  return SESSION_TOKEN_PATTERN.test(value) ? value : null;
}
