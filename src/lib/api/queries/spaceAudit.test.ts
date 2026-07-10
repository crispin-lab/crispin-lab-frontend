import { describe, expect, it } from "vitest";

import { asSpaceId } from "../ids";

import { spaceAuditKeys, spaceAuditListOptions } from "./spaceAudit";

describe("spaceAuditKeys factory", () => {
  it("상위 key 가 하위 key 의 prefix 가 된다 — lists / listBySpace / list", () => {
    const spaceId = asSpaceId("s_1");
    const params = { page: 0, size: 20 };
    const list = spaceAuditKeys.list(spaceId, params);

    expect(list.slice(0, spaceAuditKeys.all.length)).toEqual([...spaceAuditKeys.all]);
    expect(list.slice(0, spaceAuditKeys.lists().length)).toEqual([...spaceAuditKeys.lists()]);
    expect(list.slice(0, spaceAuditKeys.listBySpace(spaceId).length)).toEqual([
      ...spaceAuditKeys.listBySpace(spaceId),
    ]);
  });

  it("서로 다른 spaceId 의 listBySpace 는 겹치지 않는다 — cross-space invalidation 방지", () => {
    const a = spaceAuditKeys.listBySpace(asSpaceId("s_a"));
    const b = spaceAuditKeys.listBySpace(asSpaceId("s_b"));
    expect(a).not.toEqual(b);
    expect(a.slice(0, -1)).toEqual(b.slice(0, -1));
  });
});

describe("spaceAuditListOptions", () => {
  it("queryKey 가 spaceAuditKeys.list 와 일치한다", () => {
    const spaceId = asSpaceId("s_42");
    const params = { page: 1, size: 20 };
    expect(spaceAuditListOptions(spaceId, params).queryKey).toEqual(
      spaceAuditKeys.list(spaceId, params),
    );
  });
});
