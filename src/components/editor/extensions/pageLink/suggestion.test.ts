import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { asSpaceId } from "@/lib/api/ids";
import type { PageSearchResult, PageSummary } from "@/lib/api/types";

import { createDebouncedSearch } from "./suggestion";

function summary(pageId: string, title: string): PageSummary {
  return {
    pageId,
    title,
    spaceId: "s_1",
    updatedAt: "2026-01-01T00:00:00Z",
    displayOrder: 0,
    authorHandle: "author",
    authorId: "u_1",
    visibility: "PUBLIC",
  };
}

function searchResult(items: PageSummary[]): PageSearchResult {
  return {
    size: 20,
    isEmpty: items.length === 0,
    totalPages: items.length === 0 ? 0 : 1,
    hasNext: false,
    page: 0,
    items,
    totalElements: items.length,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createDebouncedSearch", () => {
  it("빈 query 는 fetch 없이 즉시 [] 로 resolve 한다", async () => {
    const search = vi.fn();
    const debounced = createDebouncedSearch(asSpaceId("s_1"), { search, delayMs: 50 });

    await expect(debounced("")).resolves.toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });

  it("정상 호출은 delay 후 결과를 resolve 한다", async () => {
    const items = [summary("p_a", "회의록"), summary("p_b", "독서")];
    const search = vi.fn().mockResolvedValue(searchResult(items));
    const debounced = createDebouncedSearch(asSpaceId("s_1"), { search, delayMs: 50 });

    const promise = debounced("회");
    expect(search).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(50);
    await expect(promise).resolves.toEqual(items);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("supersede 된 호출은 빈 배열로 resolve 되어 await 가 hang 되지 않는다", async () => {
    const search = vi.fn().mockResolvedValue(searchResult([summary("p_a", "회의록")]));
    const debounced = createDebouncedSearch(asSpaceId("s_1"), { search, delayMs: 50 });

    const superseded = debounced("회");
    const latest = debounced("회의");

    await expect(superseded).resolves.toEqual([]);

    await vi.advanceTimersByTimeAsync(50);
    await expect(latest).resolves.toEqual([summary("p_a", "회의록")]);
  });

  it("이미 fetch 중인 호출은 supersede 시 abort 된다", async () => {
    const aborted: boolean[] = [];
    const search = vi.fn().mockImplementation(
      (_params, signal: AbortSignal) =>
        new Promise<PageSearchResult>((resolve, reject) => {
          signal.addEventListener("abort", () => {
            aborted.push(true);
            reject(new DOMException("Aborted", "AbortError"));
          });
          setTimeout(() => resolve(searchResult([summary("p_late", "지각")])), 1000);
        }),
    );
    const debounced = createDebouncedSearch(asSpaceId("s_1"), { search, delayMs: 50 });

    const superseded = debounced("회");
    await vi.advanceTimersByTimeAsync(50);
    expect(search).toHaveBeenCalledTimes(1);

    const latest = debounced("회의");
    await expect(superseded).resolves.toEqual([]);
    expect(aborted).toEqual([true]);

    await vi.advanceTimersByTimeAsync(50);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(latest).resolves.toEqual([summary("p_late", "지각")]);
  });

  it("fetch 실패는 빈 배열로 resolve 된다", async () => {
    const search = vi.fn().mockRejectedValue(new Error("network"));
    const debounced = createDebouncedSearch(asSpaceId("s_1"), { search, delayMs: 50 });

    const promise = debounced("회");
    await vi.advanceTimersByTimeAsync(50);
    await expect(promise).resolves.toEqual([]);
  });

  it("빈 query 로 supersede 하면 직전 호출이 종료된다", async () => {
    const search = vi.fn().mockResolvedValue(searchResult([]));
    const debounced = createDebouncedSearch(asSpaceId("s_1"), { search, delayMs: 50 });

    const superseded = debounced("회");
    const cleared = debounced("");

    await expect(superseded).resolves.toEqual([]);
    await expect(cleared).resolves.toEqual([]);
    await vi.advanceTimersByTimeAsync(50);
    expect(search).not.toHaveBeenCalled();
  });
});
