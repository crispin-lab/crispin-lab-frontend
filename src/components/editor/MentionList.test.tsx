import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import type { PageSummary } from "@/lib/api/types";

import { MentionList, type MentionListHandle } from "./MentionList";

function makeItems(): PageSummary[] {
  return [
    {
      pageId: "p_a",
      title: "회의록",
      spaceId: "s_1",
      updatedAt: "2026-01-01T00:00:00Z",
      displayOrder: 0,
    },
    {
      pageId: "p_b",
      title: "아이디어",
      spaceId: "s_1",
      updatedAt: "2026-01-02T00:00:00Z",
      displayOrder: 1,
    },
    {
      pageId: "p_c",
      title: "독서",
      spaceId: "s_1",
      updatedAt: "2026-01-03T00:00:00Z",
      displayOrder: 2,
    },
  ];
}

function keyEvent(key: string): { event: KeyboardEvent } {
  return { event: new KeyboardEvent("keydown", { key }) };
}

describe("MentionList", () => {
  it("결과가 비어 있으면 안내 문구를 보여주고 어떤 키도 처리하지 않는다", () => {
    const ref = createRef<MentionListHandle>();
    render(<MentionList ref={ref} items={[]} command={vi.fn()} />);

    expect(screen.getByText("검색 결과가 없습니다.")).toBeInTheDocument();
    expect(ref.current?.onKeyDown(keyEvent("Enter"))).toBe(false);
    expect(ref.current?.onKeyDown(keyEvent("ArrowDown"))).toBe(false);
  });

  it("처음에는 첫 항목이 선택되고 ArrowDown 으로 순환한다", () => {
    const ref = createRef<MentionListHandle>();
    render(<MentionList ref={ref} items={makeItems()} command={vi.fn()} />);

    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    act(() => {
      ref.current?.onKeyDown(keyEvent("ArrowDown"));
    });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");

    act(() => {
      ref.current?.onKeyDown(keyEvent("ArrowDown"));
      ref.current?.onKeyDown(keyEvent("ArrowDown"));
    });
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
  });

  it("Enter 가 현재 선택된 항목을 command 로 전달한다", () => {
    const ref = createRef<MentionListHandle>();
    const command = vi.fn();
    render(<MentionList ref={ref} items={makeItems()} command={command} />);

    act(() => {
      ref.current?.onKeyDown(keyEvent("ArrowDown"));
    });
    act(() => {
      ref.current?.onKeyDown(keyEvent("Enter"));
    });

    expect(command).toHaveBeenCalledWith({ id: "p_b", label: "아이디어" });
  });

  it("처리하지 않는 키는 false 를 반환해 상위 핸들러로 흘려보낸다", () => {
    const ref = createRef<MentionListHandle>();
    render(<MentionList ref={ref} items={makeItems()} command={vi.fn()} />);

    expect(ref.current?.onKeyDown(keyEvent("Escape"))).toBe(false);
    expect(ref.current?.onKeyDown(keyEvent("a"))).toBe(false);
  });
});
