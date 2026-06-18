import { describe, expect, it } from "vitest";

import {
  VISIBILITY_VALUES,
  buildCascadeBlockedReason,
  isVisibilityBlockedByCascade,
} from "./visibility";

describe("isVisibilityBlockedByCascade", () => {
  // space.visibility → 차단되어야 할 option 집합. DRAFT/INTERNAL 은 rank 0 으로 동일.
  const expected: Record<(typeof VISIBILITY_VALUES)[number], string[]> = {
    PUBLIC: [],
    MEMBER: ["PUBLIC"],
    INTERNAL: ["MEMBER", "PUBLIC"],
    DRAFT: ["MEMBER", "PUBLIC"],
  };

  it.each(VISIBILITY_VALUES)(
    "space.visibility=%s 일 때 매트릭스대로 차단된다",
    (spaceVisibility) => {
      const blocked = VISIBILITY_VALUES.filter((option) =>
        isVisibilityBlockedByCascade(option, spaceVisibility),
      );
      expect(blocked).toEqual(expected[spaceVisibility]);
    },
  );
});

describe("buildCascadeBlockedReason", () => {
  it("space.visibility 라벨이 한국어 존댓말 한 문장으로 포함된다", () => {
    expect(buildCascadeBlockedReason("INTERNAL")).toBe(
      "이 스페이스는 비공개 입니다. 페이지를 더 넓게 공개할 수 없습니다.",
    );
    expect(buildCascadeBlockedReason("MEMBER")).toBe(
      "이 스페이스는 멤버 공개 입니다. 페이지를 더 넓게 공개할 수 없습니다.",
    );
  });
});
