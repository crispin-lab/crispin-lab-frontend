import { vi } from "vitest";

// callback / options 를 저장하고 등록 target 을 추적해, 테스트가 synthetic entries 로 hook 의 active state 갱신 로직을 회귀 검증할 수 있게 한다.

// target / isIntersecting 만 hook 이 읽으므로 나머지는 Partial — 테스트마다 entry 전 필드를 채우는 부담을 회피.
type MockEntry = Pick<IntersectionObserverEntry, "target" | "isIntersecting"> &
  Partial<IntersectionObserverEntry>;

export class MockIntersectionObserver implements IntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  static reset(): void {
    MockIntersectionObserver.instances.length = 0;
  }

  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly scrollMargin: string;
  readonly thresholds: ReadonlyArray<number>;
  readonly targets = new Set<Element>();
  readonly callback: IntersectionObserverCallback;

  observe = vi.fn((target: Element) => {
    this.targets.add(target);
  });
  unobserve = vi.fn((target: Element) => {
    this.targets.delete(target);
  });
  disconnect = vi.fn(() => {
    this.targets.clear();
  });
  takeRecords = vi.fn((): IntersectionObserverEntry[] => []);

  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
    this.callback = callback;
    this.root = options.root ?? null;
    this.rootMargin = options.rootMargin ?? "0px";
    this.scrollMargin = options.scrollMargin ?? "0px";
    const threshold = options.threshold ?? 0;
    this.thresholds = Array.isArray(threshold) ? threshold : [threshold];
    MockIntersectionObserver.instances.push(this);
  }

  trigger(entries: ReadonlyArray<MockEntry>): void {
    this.callback(entries as unknown as IntersectionObserverEntry[], this);
  }
}

export function lastIntersectionObserver(): MockIntersectionObserver {
  const last = MockIntersectionObserver.instances.at(-1);
  if (!last) throw new Error("IntersectionObserver 인스턴스가 아직 생성되지 않았습니다.");
  return last;
}
