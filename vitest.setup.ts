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

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  // instances 배열은 restoreMocks 범위 밖 — 이전 테스트의 인스턴스가 lastIntersectionObserver() 에 새지 않게 명시 reset.
  MockIntersectionObserver.reset();
});
afterAll(() => server.close());
