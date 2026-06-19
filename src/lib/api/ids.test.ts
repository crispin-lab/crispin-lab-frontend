import { describe, expect, it } from "vitest";

import { asPageId, asSpaceId, asTagId, asUserId } from "./ids";

describe("브랜드 타입 lift", () => {
  it("asPageId 는 입력 문자열을 그대로 흘린다 (런타임 no-op)", () => {
    expect(asPageId("p_123")).toBe("p_123");
  });

  it("asSpaceId / asUserId / asTagId 도 동일하게 동작한다", () => {
    expect(asSpaceId("s_42")).toBe("s_42");
    expect(asUserId("u_7")).toBe("u_7");
    expect(asTagId("t_9")).toBe("t_9");
  });
});
