import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { sessionCookieOptions } from "@/lib/auth/session";

// 백엔드 contract: POST /v1/sessions → 200 + { sessionToken: "sess_<43-base64>" }.
// 변경 시 본 핸들러의 token 추출 / 검증을 같이 갱신한다.
const SESSION_TOKEN_PATTERN = /^sess_[A-Za-z0-9_-]{43}$/;

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

  const upstream = await fetch(`${backendUrl.replace(/\/$/, "")}/v1/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: requestBody,
  });

  if (!upstream.ok) {
    // 4xx/5xx 는 body / content-type 을 그대로 패스스루 — 백엔드 message 가 사용자에게 노출되도록.
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
  // 응답 디코딩 경계의 narrowing — 바로 아래 정규식으로 값 형식까지 재검증한다.
  const value = (parsed as Record<string, unknown>).sessionToken;
  if (typeof value !== "string") return null;
  return SESSION_TOKEN_PATTERN.test(value) ? value : null;
}
