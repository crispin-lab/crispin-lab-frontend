import { describe, expect, it } from "vitest";

import { asSpaceId } from "../ids";

import { spaceDetailOptions, spaceKeys, spaceListOptions } from "./space";

describe("spaceKeys factory", () => {
  it("상위 key 가 하위 key 의 prefix 가 된다 (상위 invalidation 이 하위까지 전파)", () => {
    const spaceId = asSpaceId("s_1");

    const list = spaceKeys.list({ page: 0, size: 20 });
    expect(list.slice(0, spaceKeys.all.length)).toEqual([...spaceKeys.all]);
    expect(list.slice(0, spaceKeys.lists().length)).toEqual([...spaceKeys.lists()]);

    const detail = spaceKeys.detail(spaceId);
    expect(detail.slice(0, spaceKeys.all.length)).toEqual([...spaceKeys.all]);
    expect(detail.slice(0, spaceKeys.details().length)).toEqual([...spaceKeys.details()]);
  });

  it("list 와 detail 의 prefix 가 서로 다르다 (잘못된 invalidation 방지)", () => {
    expect(spaceKeys.lists()[1]).toBe("list");
    expect(spaceKeys.details()[1]).toBe("detail");
  });

  it("같은 인자로 부른 key 는 reference equality 까지 가지 않더라도 값이 같다", () => {
    const id = asSpaceId("s_1");
    expect(spaceKeys.detail(id)).toEqual(spaceKeys.detail(id));
  });
});

describe("spaceDetailOptions / spaceListOptions", () => {
  it("spaceDetailOptions 의 queryKey 가 spaceKeys.detail 과 일치한다", () => {
    const spaceId = asSpaceId("s_42");
    expect(spaceDetailOptions(spaceId).queryKey).toEqual(spaceKeys.detail(spaceId));
  });

  it("spaceListOptions 의 queryKey 가 spaceKeys.list 와 일치한다", () => {
    const params = { page: 1, size: 20 };
    expect(spaceListOptions(params).queryKey).toEqual(spaceKeys.list(params));
  });
});
