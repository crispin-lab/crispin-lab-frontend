import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { asUserId } from "@/lib/api/ids";
import type { UserSearchResult, UserSummary } from "@/lib/api/types";

import { createDebouncedSearch } from "./suggestion";

function user(userId: string, handle: string): UserSummary {
  return { userId: asUserId(userId), handle };
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
    const debounced = createDebouncedSearch({ search, delayMs: 50 });

    await expect(debounced("")).resolves.toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });

  it("정상 호출은 delay 후 결과를 resolve 한다", async () => {
    const items = [user("u_a", "alice"), user("u_b", "alice_kim")];
    const search = vi.fn().mockResolvedValue({ items });
    const debounced = createDebouncedSearch({ search, delayMs: 50 });

    const promise = debounced("al");
    expect(search).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(50);
    await expect(promise).resolves.toEqual(items);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("supersede 된 호출은 빈 배열로 resolve 되어 await 가 hang 되지 않는다", async () => {
    const search = vi.fn().mockResolvedValue({ items: [user("u_a", "alice")] });
    const debounced = createDebouncedSearch({ search, delayMs: 50 });

    const superseded = debounced("al");
    const latest = debounced("ali");

    await expect(superseded).resolves.toEqual([]);

    await vi.advanceTimersByTimeAsync(50);
    await expect(latest).resolves.toEqual([user("u_a", "alice")]);
  });

  it("이미 fetch 중인 호출은 supersede 시 abort 된다", async () => {
    const aborted: boolean[] = [];
    const search = vi.fn().mockImplementation(
      (_params, signal: AbortSignal) =>
        new Promise<UserSearchResult>((resolve, reject) => {
          signal.addEventListener("abort", () => {
            aborted.push(true);
            reject(new DOMException("Aborted", "AbortError"));
          });
          setTimeout(() => resolve({ items: [user("u_late", "late")] }), 1000);
        }),
    );
    const debounced = createDebouncedSearch({ search, delayMs: 50 });

    const superseded = debounced("al");
    await vi.advanceTimersByTimeAsync(50);
    expect(search).toHaveBeenCalledTimes(1);

    const latest = debounced("ali");
    await expect(superseded).resolves.toEqual([]);
    expect(aborted).toEqual([true]);

    await vi.advanceTimersByTimeAsync(50);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(latest).resolves.toEqual([user("u_late", "late")]);
  });

  it("fetch 실패는 빈 배열로 resolve 된다", async () => {
    const search = vi.fn().mockRejectedValue(new Error("network"));
    const debounced = createDebouncedSearch({ search, delayMs: 50 });

    const promise = debounced("al");
    await vi.advanceTimersByTimeAsync(50);
    await expect(promise).resolves.toEqual([]);
  });

  it("빈 query 로 supersede 하면 직전 호출이 종료된다", async () => {
    const search = vi.fn().mockResolvedValue({ items: [] });
    const debounced = createDebouncedSearch({ search, delayMs: 50 });

    const superseded = debounced("al");
    const cleared = debounced("");

    await expect(superseded).resolves.toEqual([]);
    await expect(cleared).resolves.toEqual([]);
    await vi.advanceTimersByTimeAsync(50);
    expect(search).not.toHaveBeenCalled();
  });
});
