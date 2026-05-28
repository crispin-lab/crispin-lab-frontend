import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(): Promise<Response> {
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
