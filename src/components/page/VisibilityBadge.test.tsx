import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VisibilityBadge } from "./VisibilityBadge";

describe("VisibilityBadge", () => {
  it("known visibility 값은 라벨과 아이콘으로 매핑된다", () => {
    render(<VisibilityBadge visibility="PUBLIC" />);
    expect(screen.getByLabelText(/공개 범위: 공개/)).toBeInTheDocument();
  });

  it("알 수 없는 값도 fallback 으로 그대로 라벨 노출 (백엔드 enum 드리프트 방어)", () => {
    render(<VisibilityBadge visibility="WEIRD" />);
    expect(screen.getByLabelText(/공개 범위: WEIRD/)).toBeInTheDocument();
  });
});
