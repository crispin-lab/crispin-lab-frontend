import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "session";

// cookie 존재만 본 coarse 인증 여부 — 실제 유효성은 BE 가 401 로 보장. Server Component 라우트의 단일 진입점.
export async function hasSessionCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME) != null;
}

export type SessionCookieOptions = {
  name: typeof SESSION_COOKIE_NAME;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
};

export function sessionCookieOptions(value: string): SessionCookieOptions {
  return {
    name: SESSION_COOKIE_NAME,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}
