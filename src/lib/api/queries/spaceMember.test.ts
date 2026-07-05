import { describe, expect, it } from "vitest";

import { asSpaceId } from "../ids";

import { spaceMemberKeys, spaceMemberListOptions } from "./spaceMember";

describe("spaceMemberKeys factory", () => {
  it("상위 key 가 하위 key 의 prefix 가 된다 — lists / listBySpace / list", () => {
    const spaceId = asSpaceId("s_1");
    const params = { page: 0, size: 20 };
    const list = spaceMemberKeys.list(spaceId, params);

    expect(list.slice(0, spaceMemberKeys.all.length)).toEqual([...spaceMemberKeys.all]);
    expect(list.slice(0, spaceMemberKeys.lists().length)).toEqual([...spaceMemberKeys.lists()]);
    expect(list.slice(0, spaceMemberKeys.listBySpace(spaceId).length)).toEqual([
      ...spaceMemberKeys.listBySpace(spaceId),
    ]);
  });

  it("서로 다른 spaceId 의 listBySpace 는 겹치지 않는다 — cross-space invalidation 방지", () => {
    const a = spaceMemberKeys.listBySpace(asSpaceId("s_a"));
    const b = spaceMemberKeys.listBySpace(asSpaceId("s_b"));
    expect(a).not.toEqual(b);
    // 마지막 segment 만 다르다 (spaceId).
    expect(a.slice(0, -1)).toEqual(b.slice(0, -1));
  });
});

describe("spaceMemberListOptions", () => {
  it("queryKey 가 spaceMemberKeys.list 와 일치한다", () => {
    const spaceId = asSpaceId("s_42");
    const params = { page: 1, size: 20 };
    expect(spaceMemberListOptions(spaceId, params).queryKey).toEqual(
      spaceMemberKeys.list(spaceId, params),
    );
  });
});
