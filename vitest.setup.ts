import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import { server } from "@/mocks/server";
import { MockIntersectionObserver } from "@/test/intersectionObserver";

// sonner / next-themes 가 prefers-color-scheme / prefers-reduced-motion 검사용으로 matchMedia 를 호출 — jsdom 에 없어 polyfill.
// next-themes 0.4.6 은 deprecated `addListener` / `removeListener` 도 호출하므로 legacy 메서드도 함께 노출 (상위 버전 업그레이드 시 재검토).
if (typeof window !== "undefined" && typeof window.matchMedia === "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

// useActiveHeading 이 IntersectionObserver 를 의존 — jsdom 에 없어 stub 주입. 구현은 @/test/intersectionObserver.
if (typeof window !== "undefined" && typeof window.IntersectionObserver === "undefined") {
  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    value: MockIntersectionObserver,
  });
}

// TipTap table NodeView (column resize) 가 ResizeObserver 를 의존 — jsdom 에 없어 no-op stub.
if (typeof window !== "undefined" && typeof window.ResizeObserver === "undefined") {
  class NoopResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: NoopResizeObserver,
  });
}

// SlashMenuList 등 키보드 nav 컴포넌트의 effect 가 scrollIntoView 의존 — jsdom 에 없어 no-op stub.
// 호출 횟수 검증이 필요한 테스트는 vi.spyOn(HTMLElement.prototype, "scrollIntoView") 로 덮어쓴다.
if (
  typeof window !== "undefined" &&
  typeof window.HTMLElement.prototype.scrollIntoView === "undefined"
) {
  Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    writable: true,
    value: function () {},
  });
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  // instances 배열은 restoreMocks 범위 밖 — 이전 테스트의 인스턴스가 lastIntersectionObserver() 에 새지 않게 명시 reset.
  MockIntersectionObserver.reset();
});
afterAll(() => server.close());
