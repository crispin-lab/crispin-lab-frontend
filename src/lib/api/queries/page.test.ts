import { describe, expect, it } from "vitest";

import { asPageId, asSpaceId } from "../ids";

import { pageDetailOptions, pageKeys, pageListOptions } from "./page";

describe("pageKeys factory", () => {
  it("상위 key 가 하위 key 의 prefix 가 된다 (상위 invalidation 이 하위까지 전파)", () => {
    const spaceId = asSpaceId("s_1");
    const pageId = asPageId("p_1");

    const list = pageKeys.list({ spaceId });
    expect(list.slice(0, pageKeys.all.length)).toEqual([...pageKeys.all]);
    expect(list.slice(0, pageKeys.lists().length)).toEqual([...pageKeys.lists()]);

    const detail = pageKeys.detail(pageId);
    expect(detail.slice(0, pageKeys.all.length)).toEqual([...pageKeys.all]);
    expect(detail.slice(0, pageKeys.details().length)).toEqual([...pageKeys.details()]);
  });

  it("list 와 detail 의 prefix 가 서로 다르다 (잘못된 invalidation 방지)", () => {
    expect(pageKeys.lists()[1]).toBe("list");
    expect(pageKeys.details()[1]).toBe("detail");
  });

  it("같은 인자로 부른 key 는 reference equality 까지 가지 않더라도 값이 같다", () => {
    const id = asPageId("p_1");
    expect(pageKeys.detail(id)).toEqual(pageKeys.detail(id));
  });
});

describe("pageDetailOptions / pageListOptions", () => {
  it("pageDetailOptions 의 queryKey 가 pageKeys.detail 과 일치한다", () => {
    const pageId = asPageId("p_42");
    expect(pageDetailOptions(pageId).queryKey).toEqual(pageKeys.detail(pageId));
  });

  it("pageListOptions 의 queryKey 가 pageKeys.list 와 일치한다", () => {
    const params = { spaceId: asSpaceId("s_42"), page: 1, size: 20 };
    expect(pageListOptions(params).queryKey).toEqual(pageKeys.list(params));
  });
});
