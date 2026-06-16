import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import { server } from "@/mocks/server";

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

// TOC 의 useActiveHeading hook 이 IntersectionObserver 를 의존 — jsdom 에 없어 stub. callback 은 호출되지 않아 테스트는 active state 가 null 로 남는다.
if (typeof window !== "undefined" && typeof window.IntersectionObserver === "undefined") {
  class MockIntersectionObserver {
    root = null;
    rootMargin = "";
    thresholds: number[] = [];
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
  }
  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    value: MockIntersectionObserver,
  });
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
