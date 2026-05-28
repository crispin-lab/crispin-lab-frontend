export const SESSION_COOKIE_NAME = "session";

export type SessionCookieOptions = {
  name: typeof SESSION_COOKIE_NAME;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
};

// maxAge 미설정 — session cookie 로 두고 서버 측 sliding expiry 만 신뢰 (auth.md).
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
