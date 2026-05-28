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
