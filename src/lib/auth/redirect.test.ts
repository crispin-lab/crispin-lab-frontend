import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { redirectToLogin, resetRedirectGuardForTest, safeRedirectTarget } from "./redirect";

describe("redirectToLogin", () => {
  let assignSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetRedirectGuardForTest();
    assignSpy = vi.fn();
    // jsdom 의 window.location 은 method spy 가 막혀 객체 자체를 교체한다.
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: {
        pathname: "/pages/p_1",
        search: "?tab=draft",
        assign: assignSpy,
      },
    });
  });

  afterEach(() => {
    resetRedirectGuardForTest();
  });

  it("현재 pathname + search 를 redirect 쿼리로 인코딩해 /login 으로 이동한다", () => {
    redirectToLogin();

    expect(assignSpy).toHaveBeenCalledTimes(1);
    expect(assignSpy).toHaveBeenCalledWith(
      `/login?redirect=${encodeURIComponent("/pages/p_1?tab=draft")}`,
    );
  });

  it("두 번째 호출은 무시한다 (다중 401 debounce)", () => {
    redirectToLogin();
    redirectToLogin();
    redirectToLogin();

    expect(assignSpy).toHaveBeenCalledTimes(1);
  });

  it("/login 경로에서 호출되면 재진입을 막는다 (refresh loop 차단)", () => {
    window.location.pathname = "/login";
    window.location.search = "?redirect=%2Fpages%2Fp_1";

    redirectToLogin();

    expect(assignSpy).not.toHaveBeenCalled();
  });

  it("/login/forgot 같은 segment 경로도 재진입 차단", () => {
    window.location.pathname = "/login/forgot";
    window.location.search = "";

    redirectToLogin();

    expect(assignSpy).not.toHaveBeenCalled();
  });

  it("/login-help 같은 prefix-only 경로는 재진입으로 보지 않는다", () => {
    window.location.pathname = "/login-help";
    window.location.search = "";

    redirectToLogin();

    expect(assignSpy).toHaveBeenCalledWith(`/login?redirect=${encodeURIComponent("/login-help")}`);
  });

  it("window 가 정의되지 않은 환경 (SSR) 에서는 조용히 return", () => {
    const originalWindow = globalThis.window;
    delete (globalThis as { window?: Window }).window;

    try {
      expect(() => redirectToLogin()).not.toThrow();
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("search 가 비어 있으면 pathname 만 redirect 쿼리로", () => {
    window.location.pathname = "/spaces";
    window.location.search = "";

    redirectToLogin();

    expect(assignSpy).toHaveBeenCalledWith(`/login?redirect=${encodeURIComponent("/spaces")}`);
  });
});

describe("safeRedirectTarget", () => {
  it("null/빈 문자열은 / 로", () => {
    expect(safeRedirectTarget(null)).toBe("/");
    expect(safeRedirectTarget(undefined)).toBe("/");
    expect(safeRedirectTarget("")).toBe("/");
  });

  it("/ 로 시작하는 same-origin path 는 그대로 통과", () => {
    expect(safeRedirectTarget("/pages/abc")).toBe("/pages/abc");
    expect(safeRedirectTarget("/spaces?tab=draft")).toBe("/spaces?tab=draft");
    expect(safeRedirectTarget("/")).toBe("/");
  });

  it("절대 URL 은 차단 (open redirect 방어)", () => {
    expect(safeRedirectTarget("https://evil.com")).toBe("/");
    expect(safeRedirectTarget("http://evil.com/path")).toBe("/");
    expect(safeRedirectTarget("javascript:alert(1)")).toBe("/");
  });

  it("protocol-relative URL (// 시작) 도 차단", () => {
    expect(safeRedirectTarget("//evil.com")).toBe("/");
    expect(safeRedirectTarget("//evil.com/login")).toBe("/");
  });

  it("backslash 가 섞인 우회 시도도 차단", () => {
    expect(safeRedirectTarget("/\\evil.com")).toBe("/");
  });

  it("/ 로 시작하지 않는 임의 문자열은 / 로", () => {
    expect(safeRedirectTarget("pages/abc")).toBe("/");
    expect(safeRedirectTarget("../../etc/passwd")).toBe("/");
  });
});
