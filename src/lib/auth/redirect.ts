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

export function __resetRedirectGuardForTest__(): void {
  isRedirecting = false;
}

function isLoginPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

export function loginRedirectUrl(target: string): string {
  return `/login?redirect=${encodeURIComponent(target)}`;
}

// 명시적 logout 직후의 navigation. `redirectToLogin` 과 의미가 다르다 — 사용자가 *의도적으로* 떠난 흐름이라
// 직전 path 를 redirect 쿼리에 넣지 않고, isRedirecting singleton 도 거치지 않는다. `replace` 를 쓰는 이유:
// 백버튼으로 권한 있던 직전 페이지 (RSC 캐시 / 메모이즈 산출물) 가 잠깐 노출되거나 401 재 redirect race 를
// 막기 위함. (redirectToLogin 의 만료 흐름은 사용자가 같은 페이지로 돌아오고 싶을 수 있어 history 보존 = assign)
export function navigateAfterLogout(): void {
  if (typeof window === "undefined") return;
  window.location.replace("/login");
}

// attacker 가 제어하는 redirect 쿼리에 대한 open redirect 방어 — same-origin path 만 허용.
export function safeRedirectTarget(raw: string | null | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  if (raw.startsWith("/\\")) return "/";
  return raw;
}
