import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(request: Request): Promise<Response> {
  // CSRF 1 차 방어 — SameSite=Lax 가 cross-site cookie 동봉을 막지만, 응답의 `Set-Cookie: session=; Max-Age=0`
  // 자체는 그대로 도달해 사용자의 의도와 무관하게 logged-out 시킬 수 있다 (forced-logout). 브라우저가 박는
  // `Sec-Fetch-Site: same-origin` 만 통과시켜 cross-site / 헤더 누락 (구식 브라우저) 요청을 차단.
  if (request.headers.get("sec-fetch-site") !== "same-origin") {
    return NextResponse.json(
      { code: "CSRF_BLOCKED", message: "요청을 처리하지 못했습니다." },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const backendUrl = process.env.BACKEND_URL;

  if (sessionToken && backendUrl) {
    // best-effort — 네트워크 실패 / 5xx / timeout 어느 결과에서도 cookie 는 지운다.
    await fetch(`${backendUrl.replace(/\/$/, "")}/v1/sessions/me`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${sessionToken}` },
      signal: AbortSignal.timeout(3_000),
    }).catch(() => undefined);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);

  return NextResponse.json({ ok: true });
}
