import { describe, expect, it } from "vitest";

import { asPageId } from "../ids";

import { commentKeys, commentListOptions } from "./comment";

describe("commentKeys factory", () => {
  it("상위 key 가 하위 key 의 prefix 가 된다 (상위 invalidation 이 하위까지 전파)", () => {
    const pageId = asPageId("p_1");

    const list = commentKeys.list(pageId, { page: 0, size: 20 });
    expect(list.slice(0, commentKeys.all.length)).toEqual([...commentKeys.all]);
    expect(list.slice(0, commentKeys.lists().length)).toEqual([...commentKeys.lists()]);
  });

  it("같은 pageId 의 모든 list 를 한 번에 무효화할 수 있도록 pageLists 가 list 의 prefix", () => {
    const pageId = asPageId("p_1");
    const list = commentKeys.list(pageId, { page: 0 });
    const pageLists = commentKeys.pageLists(pageId);
    expect(list.slice(0, pageLists.length)).toEqual([...pageLists]);
  });

  it("같은 인자로 부른 list key 는 값이 같다", () => {
    const id = asPageId("p_1");
    expect(commentKeys.list(id)).toEqual(commentKeys.list(id));
  });
});

describe("commentListOptions", () => {
  it("queryKey 가 commentKeys.list 와 일치한다", () => {
    const pageId = asPageId("p_42");
    const params = { page: 1, size: 20 };
    expect(commentListOptions(pageId, params).queryKey).toEqual(commentKeys.list(pageId, params));
  });
});
