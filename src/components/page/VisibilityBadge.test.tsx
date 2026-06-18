import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VisibilityBadge } from "./VisibilityBadge";

describe("VisibilityBadge", () => {
  it.each([
    { visibility: "DRAFT", label: "초안", iconColor: "text-muted-foreground" },
    { visibility: "INTERNAL", label: "비공개", iconColor: "text-muted-foreground" },
    { visibility: "MEMBER", label: "멤버 공개", iconColor: "text-muted-foreground" },
    { visibility: "PUBLIC", label: "공개", iconColor: "text-accent" },
  ])(
    "$visibility 는 '$label' 라벨 + $iconColor 아이콘 색으로 렌더된다",
    ({ visibility, label, iconColor }) => {
      render(<VisibilityBadge visibility={visibility} />);
      // lucide 아이콘은 role/label 이 없어 RTL 쿼리로 접근 불가 — chip wrapper 안에서
      // svg 를 직접 꺼내 per-tier 색 매핑 (디자인 정합) 만 회귀로 잡는다.
      const chip = screen.getByLabelText(`공개 범위: ${label}`);
      const icon = chip.querySelector("svg");
      expect(icon).not.toBeNull();
      expect(icon?.getAttribute("class") ?? "").toContain(iconColor);
    },
  );

  it("알 수 없는 값도 fallback 으로 그대로 라벨 노출 (백엔드 enum 드리프트 방어)", () => {
    render(<VisibilityBadge visibility="WEIRD" />);
    expect(screen.getByLabelText(/공개 범위: WEIRD/)).toBeInTheDocument();
  });
});
