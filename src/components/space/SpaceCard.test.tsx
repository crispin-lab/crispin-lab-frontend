import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { spaceSummary, spaceSummaryWithNullLatestPage } from "@/test/fixtures/space";

import { SpaceCard } from "./SpaceCard";

describe("SpaceCard", () => {
  it("기본 필드 (이름 · description · visibility · role · 페이지수 · 멤버수 · 최근 활동) 를 모두 노출한다", () => {
    render(
      <SpaceCard
        space={spaceSummary({
          name: "공개 위키",
          description: "누구나 볼 수 있는 문서",
          visibility: "PUBLIC",
          myRole: "OWNER",
          pageCount: 12,
          memberCount: 4,
          lastActivityAt: "2026-06-01T00:00:00Z",
        })}
      />,
    );

    expect(screen.getByText("공개 위키")).toBeInTheDocument();
    expect(screen.getByText("누구나 볼 수 있는 문서")).toBeInTheDocument();
    expect(screen.getByLabelText(/공개 범위: 공개/)).toBeInTheDocument();
    expect(screen.getByLabelText(/역할: 소유자/)).toBeInTheDocument();
    expect(screen.getByLabelText(/페이지 수: 12/)).toBeInTheDocument();
    expect(screen.getByLabelText(/멤버 수: 4/)).toBeInTheDocument();
    expect(screen.getByText(/^최근 활동/)).toHaveTextContent(/2026\. 06\. 01/);
  });

  it("myRole 이 null (Anonymous / 비-멤버) 이면 role 배지가 노출되지 않는다", () => {
    render(<SpaceCard space={spaceSummary({ myRole: null })} />);

    expect(screen.queryByLabelText(/역할:/)).not.toBeInTheDocument();
  });

  it("이름이 빈 문자열이면 spaceDisplayName fallback (이름 없는 스페이스) 이 italic 으로 노출된다", () => {
    render(<SpaceCard space={spaceSummary({ name: "" })} />);

    const title = screen.getByText("이름 없는 스페이스");
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass("italic");
  });

  describe("latestPage row", () => {
    it("latestPage 가 있으면 제목 + 편집 시각을 노출한다", () => {
      render(
        <SpaceCard
          space={spaceSummary({
            latestPage: {
              pageId: "p_1",
              title: "가장 최근 편집된 페이지",
              updatedAt: "2026-06-15T00:00:00Z",
            },
          })}
        />,
      );

      const row = screen.getByText("가장 최근 편집된 페이지").closest("p");
      expect(row).toHaveTextContent(/최근 편집.*가장 최근 편집된 페이지.*2026\. 06\. 15/);
      expect(screen.queryByText("아직 페이지 없음")).not.toBeInTheDocument();
    });

    it("latestPage 가 undefined 이면 '아직 페이지 없음' 안내가 노출된다", () => {
      render(<SpaceCard space={spaceSummary({ latestPage: undefined })} />);

      expect(screen.getByText("아직 페이지 없음")).toBeInTheDocument();
    });

    it("latestPage 가 null 로 도착해도 crash 없이 '아직 페이지 없음' 으로 흡수한다 (스키마 description 은 null 명시)", () => {
      render(<SpaceCard space={spaceSummaryWithNullLatestPage()} />);

      expect(screen.getByText("아직 페이지 없음")).toBeInTheDocument();
    });
  });

  describe("미읽음 배지", () => {
    it("unreadCount 가 0 이면 배지가 노출되지 않는다", () => {
      render(<SpaceCard space={spaceSummary({ unreadCount: 0 })} />);

      expect(screen.queryByLabelText(/새 소식/)).not.toBeInTheDocument();
    });

    it("unreadCount 가 1 이상이면 '새 소식 N' + aria-label 로 노출된다", () => {
      render(<SpaceCard space={spaceSummary({ unreadCount: 3 })} />);

      const badge = screen.getByLabelText("새 소식 3개");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("새 소식 3");
    });

    it("unreadCount 가 100 이상이면 시각 표시는 99+ 로 clamp 되지만 aria-label 은 실제 값을 보존한다", () => {
      render(<SpaceCard space={spaceSummary({ unreadCount: 128 })} />);

      const badge = screen.getByLabelText("새 소식 128개");
      expect(badge).toHaveTextContent("새 소식 99+");
    });
  });
});
