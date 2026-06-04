import { vi } from "vitest";

// loginRedirectUrl / safeRedirectTarget 등 같은 모듈의 다른 export 가 우연히 사라져 다른 import 가 깨지는 회귀를 막기 위해 실제 모듈을 보존하고 redirectToLogin 만 spy 로 교체한다.
export async function redirectModuleMock(spy: ReturnType<typeof vi.fn>) {
  const actual = await vi.importActual<typeof import("@/lib/auth/redirect")>("@/lib/auth/redirect");
  return { ...actual, redirectToLogin: spy };
}
