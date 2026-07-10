import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { asSpaceId, asUserId } from "@/lib/api/ids";
import type { MentionCandidateResult, MentionCandidateSummary } from "@/lib/api/types";
import type { MentionContext } from "@/lib/mention/context";

import { createDebouncedSearch } from "./suggestion";

function candidate(userId: string, handle: string): MentionCandidateSummary {
  return { userId: asUserId(userId), handle };
}

function contextFixture(overrides: Partial<MentionContext> = {}): MentionContext {
  return {
    spaceId: asSpaceId("s_1"),
    spaceVisibility: "PUBLIC",
    pageVisibility: "PUBLIC",
    pageAuthorId: asUserId("u_author"),
    ...overrides,
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
    const debounced = createDebouncedSearch({
      search,
      getContext: () => contextFixture(),
      delayMs: 50,
    });

    await expect(debounced("")).resolves.toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });

  it("context 가 null 이면 fetch 없이 [] 로 resolve 한다 (fail-closed)", async () => {
    const search = vi.fn();
    const debounced = createDebouncedSearch({
      search,
      getContext: () => null,
      delayMs: 50,
    });

    const promise = debounced("al");
    await vi.advanceTimersByTimeAsync(50);
    await expect(promise).resolves.toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });

  it("정상 호출은 delay 후 결과를 resolve 한다", async () => {
    const items = [candidate("u_a", "alice"), candidate("u_b", "alice_kim")];
    const search = vi.fn().mockResolvedValue({ items });
    const context = contextFixture();
    const debounced = createDebouncedSearch({
      search,
      getContext: () => context,
      delayMs: 50,
    });

    const promise = debounced("al");
    expect(search).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(50);
    await expect(promise).resolves.toEqual(items);
    expect(search).toHaveBeenCalledTimes(1);
    // 컨텍스트가 함께 전달되어야 서버가 볼 수 있는 사용자만 필터할 수 있다.
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ query: "al", context }),
      expect.any(AbortSignal),
    );
  });

  it("supersede 된 호출은 빈 배열로 resolve 되어 await 가 hang 되지 않는다", async () => {
    const search = vi.fn().mockResolvedValue({ items: [candidate("u_a", "alice")] });
    const debounced = createDebouncedSearch({
      search,
      getContext: () => contextFixture(),
      delayMs: 50,
    });

    const superseded = debounced("al");
    const latest = debounced("ali");

    await expect(superseded).resolves.toEqual([]);

    await vi.advanceTimersByTimeAsync(50);
    await expect(latest).resolves.toEqual([candidate("u_a", "alice")]);
  });

  it("이미 fetch 중인 호출은 supersede 시 abort 된다", async () => {
    const aborted: boolean[] = [];
    const search = vi.fn().mockImplementation(
      (_params, signal: AbortSignal) =>
        new Promise<MentionCandidateResult>((resolve, reject) => {
          signal.addEventListener("abort", () => {
            aborted.push(true);
            reject(new DOMException("Aborted", "AbortError"));
          });
          setTimeout(() => resolve({ items: [candidate("u_late", "late")] }), 1000);
        }),
    );
    const debounced = createDebouncedSearch({
      search,
      getContext: () => contextFixture(),
      delayMs: 50,
    });

    const superseded = debounced("al");
    await vi.advanceTimersByTimeAsync(50);
    expect(search).toHaveBeenCalledTimes(1);

    const latest = debounced("ali");
    await expect(superseded).resolves.toEqual([]);
    expect(aborted).toEqual([true]);

    await vi.advanceTimersByTimeAsync(50);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(latest).resolves.toEqual([candidate("u_late", "late")]);
  });

  it("fetch 실패는 빈 배열로 resolve 된다", async () => {
    const search = vi.fn().mockRejectedValue(new Error("network"));
    const debounced = createDebouncedSearch({
      search,
      getContext: () => contextFixture(),
      delayMs: 50,
    });

    const promise = debounced("al");
    await vi.advanceTimersByTimeAsync(50);
    await expect(promise).resolves.toEqual([]);
  });

  it("빈 query 로 supersede 하면 직전 호출이 종료된다", async () => {
    const search = vi.fn().mockResolvedValue({ items: [] });
    const debounced = createDebouncedSearch({
      search,
      getContext: () => contextFixture(),
      delayMs: 50,
    });

    const superseded = debounced("al");
    const cleared = debounced("");

    await expect(superseded).resolves.toEqual([]);
    await expect(cleared).resolves.toEqual([]);
    await vi.advanceTimersByTimeAsync(50);
    expect(search).not.toHaveBeenCalled();
  });

  it("context 가 재호출마다 새로 읽혀 최신 visibility 로 fetch 한다", async () => {
    const search = vi.fn().mockResolvedValue({ items: [] });
    let ctx: MentionContext = contextFixture({ pageVisibility: "PUBLIC" });
    const debounced = createDebouncedSearch({
      search,
      getContext: () => ctx,
      delayMs: 50,
    });

    ctx = contextFixture({ pageVisibility: "DRAFT" });
    const promise = debounced("al");
    await vi.advanceTimersByTimeAsync(50);
    await promise;

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ pageVisibility: "DRAFT" }),
      }),
      expect.any(AbortSignal),
    );
  });
});
