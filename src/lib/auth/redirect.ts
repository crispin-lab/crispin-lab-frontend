// 같은 tick 안의 다중 401 을 한 번의 navigation 으로 묶는 singleton.
let isRedirecting = false;

export function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  if (isRedirecting) return;
  if (isLoginPath(window.location.pathname)) return;
  isRedirecting = true;
  const target = window.location.pathname + window.location.search;
  window.location.assign(`/login?redirect=${encodeURIComponent(target)}`);
}

export function resetRedirectGuardForTest(): void {
  isRedirecting = false;
}

function isLoginPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

// Server Component 의 cookie 가드 / signup 의 "로그인" 링크 등 같은 origin 안에서
// "원래 가려던 path 로 돌아오게" 만들 때 공통으로 쓰는 URL 빌더.
export function loginRedirectUrl(target: string): string {
  return `/login?redirect=${encodeURIComponent(target)}`;
}

// attacker 가 제어하는 redirect 쿼리에 대한 open redirect 방어 — same-origin path 만 허용.
export function safeRedirectTarget(raw: string | null | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  if (raw.startsWith("/\\")) return "/";
  return raw;
}
