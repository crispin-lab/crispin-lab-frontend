import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { sessionCookieOptions } from "./session";

const SESSION_TOKEN_PATTERN = /^sess_[A-Za-z0-9_-]{43}$/;

const UPSTREAM_TIMEOUT_MS = 5_000;

export type SessionIssuingProxyOptions = {
  upstreamPath: string;
  logTag: string;
};

export async function proxyAndIssueSession(
  request: Request,
  opts: SessionIssuingProxyOptions,
): Promise<Response> {
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
    upstream = await fetch(`${backendUrl.replace(/\/$/, "")}${opts.upstreamPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "TimeoutError";
    console.error(`[${opts.logTag}] upstream fetch 실패`, {
      reason: isTimeout ? "timeout" : "network",
    });
    return NextResponse.json(
      { code: "BFF_UPSTREAM_UNAVAILABLE", message: "요청을 처리하지 못했습니다." },
      { status: 502 },
    );
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    console.error(`[${opts.logTag}] upstream 이 3xx 응답`, { status: upstream.status });
    return NextResponse.json(
      { code: "BFF_UPSTREAM_REDIRECT", message: "요청을 처리하지 못했습니다." },
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
    console.error(`[${opts.logTag}] 백엔드 응답에서 token 을 추출하지 못했습니다.`, {
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
  const value = (parsed as Record<string, unknown>).token;
  if (typeof value !== "string") return null;
  return SESSION_TOKEN_PATTERN.test(value) ? value : null;
}
