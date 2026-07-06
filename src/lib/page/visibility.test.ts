import { describe, expect, it } from "vitest";

import { SPACE_VISIBILITY_VALUES } from "@/lib/space/visibility";

import {
  VISIBILITY_VALUES,
  buildCascadeBlockedReason,
  isVisibilityBlockedByCascade,
} from "./visibility";

describe("isVisibilityBlockedByCascade", () => {
  // INTERNAL 스페이스는 space members 를 담을 수 있으므로 MEMBER 페이지 (같은 audience) 를 허용하고
  // PUBLIC 만 차단한다.
  const expected: Record<(typeof SPACE_VISIBILITY_VALUES)[number], string[]> = {
    PUBLIC: [],
    INTERNAL: ["PUBLIC"],
  };

  it.each(SPACE_VISIBILITY_VALUES)(
    "space.visibility=%s 일 때 매트릭스대로 차단된다",
    (spaceVisibility) => {
      const blocked = VISIBILITY_VALUES.filter((option) =>
        isVisibilityBlockedByCascade(option, spaceVisibility),
      );
      expect(blocked).toEqual(expected[spaceVisibility]);
    },
  );

  it("INTERNAL 스페이스에서 MEMBER 페이지는 허용된다", () => {
    expect(isVisibilityBlockedByCascade("MEMBER", "INTERNAL")).toBe(false);
  });
});

describe("buildCascadeBlockedReason", () => {
  it("space.visibility 라벨이 한국어 존댓말 한 문장으로 포함된다", () => {
    expect(buildCascadeBlockedReason("INTERNAL")).toBe(
      "이 스페이스는 비공개 입니다. 페이지를 더 넓게 공개할 수 없습니다.",
    );
    expect(buildCascadeBlockedReason("PUBLIC")).toBe(
      "이 스페이스는 공개 입니다. 페이지를 더 넓게 공개할 수 없습니다.",
    );
  });
});
