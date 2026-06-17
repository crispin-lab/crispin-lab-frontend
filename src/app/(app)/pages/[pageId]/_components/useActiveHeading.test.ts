import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MockIntersectionObserver, lastIntersectionObserver } from "@/test/intersectionObserver";

import { useActiveHeading } from "./useActiveHeading";

function mountHeading(id: string): HTMLElement {
  const el = document.createElement("h2");
  el.id = id;
  el.textContent = id;
  document.body.appendChild(el);
  return el;
}

describe("useActiveHeading", () => {
  // 글로벌 cleanup() 은 render() 트리만 정리 — manual append 한 heading 은 본 파일에서 직접.
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("초기 activeId 는 null 이다", () => {
    mountHeading("toc-0");
    const { result } = renderHook(() => useActiveHeading(["toc-0"]));

    expect(result.current).toBeNull();
  });

  it("ids 가 비어 있으면 IntersectionObserver 를 생성하지 않는다", () => {
    renderHook(() => useActiveHeading([]));

    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it("매칭되는 DOM 요소가 없으면 IntersectionObserver 를 생성하지 않는다", () => {
    renderHook(() => useActiveHeading(["toc-missing"]));

    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it("heading 이 visible 이 되면 그 id 가 activeId 로 갱신된다", () => {
    const el0 = mountHeading("toc-0");
    const { result } = renderHook(() => useActiveHeading(["toc-0"]));

    act(() => {
      lastIntersectionObserver().trigger([{ target: el0, isIntersecting: true }]);
    });

    expect(result.current).toBe("toc-0");
  });

  it("heading 1 → heading 2 로 visible 이 전환되면 activeId 가 따라 변경된다", () => {
    const el0 = mountHeading("toc-0");
    const el1 = mountHeading("toc-1");
    const { result } = renderHook(() => useActiveHeading(["toc-0", "toc-1"]));
    const io = lastIntersectionObserver();

    act(() => {
      io.trigger([{ target: el0, isIntersecting: true }]);
    });
    expect(result.current).toBe("toc-0");

    act(() => {
      io.trigger([
        { target: el0, isIntersecting: false },
        { target: el1, isIntersecting: true },
      ]);
    });
    expect(result.current).toBe("toc-1");
  });

  it("여러 heading 이 동시에 visible 이면 ids 순서가 가장 앞선 것이 active", () => {
    const el0 = mountHeading("toc-0");
    const el1 = mountHeading("toc-1");
    const el2 = mountHeading("toc-2");
    const { result } = renderHook(() => useActiveHeading(["toc-0", "toc-1", "toc-2"]));

    act(() => {
      lastIntersectionObserver().trigger([
        { target: el2, isIntersecting: true },
        { target: el1, isIntersecting: true },
        { target: el0, isIntersecting: true },
      ]);
    });

    expect(result.current).toBe("toc-0");
  });

  it("hook 은 IntersectionObserver 에 rootMargin '0px 0px -70% 0px' 를 전달한다", () => {
    mountHeading("toc-0");
    renderHook(() => useActiveHeading(["toc-0"]));

    expect(lastIntersectionObserver().rootMargin).toBe("0px 0px -70% 0px");
  });

  it("unmount 시 disconnect 가 호출되고 등록 target 이 비워진다", () => {
    mountHeading("toc-0");
    mountHeading("toc-1");
    const { unmount } = renderHook(() => useActiveHeading(["toc-0", "toc-1"]));
    const io = lastIntersectionObserver();
    expect(io.targets.size).toBe(2);

    unmount();

    expect(io.disconnect).toHaveBeenCalledTimes(1);
    expect(io.targets.size).toBe(0);
  });

  it("ids 가 바뀌면 이전 observer 가 disconnect 되고 새 observer 가 생성된다", () => {
    // idsKey content-equality 분기 (useActiveHeading.ts) 가 진짜 변경 시에는 effect 를 재실행하는지 검증.
    mountHeading("toc-0");
    mountHeading("toc-1");
    const { rerender } = renderHook(({ ids }) => useActiveHeading(ids), {
      initialProps: { ids: ["toc-0"] as ReadonlyArray<string> },
    });
    const first = lastIntersectionObserver();
    expect(MockIntersectionObserver.instances).toHaveLength(1);

    rerender({ ids: ["toc-0", "toc-1"] });

    expect(MockIntersectionObserver.instances).toHaveLength(2);
    expect(first.disconnect).toHaveBeenCalledTimes(1);
    expect(lastIntersectionObserver().targets.size).toBe(2);
  });

  it("ids 의 identity 가 새로 만들어져도 내용이 같으면 observer 가 재사용된다", () => {
    // idsKey content-equality 의 *부정* 경로 — deps 가 [ids] 로 되돌아가는 회귀 시 observer churn 을 잡는다.
    mountHeading("toc-0");
    const { rerender } = renderHook(({ ids }) => useActiveHeading(ids), {
      initialProps: { ids: ["toc-0"] as ReadonlyArray<string> },
    });
    const first = lastIntersectionObserver();
    expect(MockIntersectionObserver.instances).toHaveLength(1);

    rerender({ ids: ["toc-0"] });

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(first.disconnect).not.toHaveBeenCalled();
  });
});
