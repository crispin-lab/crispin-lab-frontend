// 모듈 레벨 singleton — 같은 tick 안의 다중 401 을 한 번의 navigation 으로 묶는다.
let isRedirecting = false;

export function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  if (isRedirecting) return;
  if (isLoginPath(window.location.pathname)) return;
  isRedirecting = true;
  const target = window.location.pathname + window.location.search;
  window.location.assign(`/login?redirect=${encodeURIComponent(target)}`);
}

// 모듈 레벨 state 의 reset 은 외부 주입 / 컨테이너 없이 다른 방법이 없어 test-only 진입점을 둔다.
export function resetRedirectGuardForTest(): void {
  isRedirecting = false;
}

function isLoginPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}
