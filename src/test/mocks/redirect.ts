import { vi } from "vitest";

type RedirectModule = typeof import("@/lib/auth/redirect");
type Spies = Partial<Pick<RedirectModule, "redirectToLogin">>;

// loginRedirectUrl / safeRedirectTarget 등 같은 모듈의 다른 export 가 우연히 사라져 다른 import 가 깨지는 회귀를 막기 위해 실제 모듈을 보존하고 spy 만 부분 교체한다.
export async function redirectModuleMock(
  arg: RedirectModule["redirectToLogin"] | Spies,
): Promise<RedirectModule> {
  const actual = await vi.importActual<RedirectModule>("@/lib/auth/redirect");
  const spies: Spies = typeof arg === "function" ? { redirectToLogin: arg } : arg;
  return {
    ...actual,
    ...(spies.redirectToLogin ? { redirectToLogin: spies.redirectToLogin } : {}),
  };
}
