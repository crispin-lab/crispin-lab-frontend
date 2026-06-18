import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import type { PageSummary } from "@/lib/api/types";
import type { Visibility } from "@/lib/page/visibility";

import { MentionList, type MentionListHandle } from "./MentionList";

function warningSpansOf(): HTMLElement[] {
  return screen.queryAllByText(/일부 독자에게는/, { selector: "span" });
}

function summary(
  overrides: Partial<PageSummary> & Pick<PageSummary, "pageId" | "title">,
): PageSummary {
  return {
    spaceId: "s_1",
    updatedAt: "2026-01-01T00:00:00Z",
    displayOrder: 0,
    authorHandle: "author",
    authorId: "u_1",
    visibility: "PUBLIC",
    ...overrides,
  };
}

function makeItems(): PageSummary[] {
  return [
    summary({ pageId: "p_a", title: "회의록" }),
    summary({
      pageId: "p_b",
      title: "아이디어",
      updatedAt: "2026-01-02T00:00:00Z",
      displayOrder: 1,
    }),
    summary({ pageId: "p_c", title: "독서", updatedAt: "2026-01-03T00:00:00Z", displayOrder: 2 }),
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

  it("source 보다 좁은 target 항목에는 sr-only 경고 메시지가 붙는다", () => {
    const items: PageSummary[] = [
      summary({ pageId: "p_pub", title: "공개", visibility: "PUBLIC" }),
      summary({ pageId: "p_int", title: "내부", visibility: "INTERNAL" }),
      summary({ pageId: "p_draft", title: "초안", visibility: "DRAFT" }),
    ];
    render(
      <MentionList
        items={items}
        command={vi.fn()}
        sourceVisibility={"PUBLIC" satisfies Visibility}
      />,
    );

    expect(warningSpansOf()).toHaveLength(2);
  });

  it("좁은 target 옵션은 aria-describedby 로 경고 메시지에 연결된다 (키보드 / 스크린리더 정합)", () => {
    const items: PageSummary[] = [
      summary({ pageId: "p_draft", title: "초안", visibility: "DRAFT" }),
    ];
    render(
      <MentionList
        items={items}
        command={vi.fn()}
        sourceVisibility={"INTERNAL" satisfies Visibility}
      />,
    );

    const option = screen.getByRole("option");
    const warningId = option.getAttribute("aria-describedby");
    expect(warningId).not.toBeNull();
    const warningEl = document.getElementById(warningId as string);
    expect(warningEl?.textContent).toBe(
      "이 페이지는 초안 페이지입니다. 비공개 페이지를 보는 일부 독자에게는 '비공개 페이지' 로 표시됩니다.",
    );
  });

  it("source 와 같거나 더 넓은 target 에는 경고가 없다", () => {
    const items: PageSummary[] = [
      summary({ pageId: "p_pub", title: "공개", visibility: "PUBLIC" }),
    ];
    render(
      <MentionList
        items={items}
        command={vi.fn()}
        sourceVisibility={"DRAFT" satisfies Visibility}
      />,
    );

    expect(warningSpansOf()).toHaveLength(0);
    expect(screen.getByRole("option")).not.toHaveAttribute("aria-describedby");
  });

  it("source 와 같은 visibility 의 target 에는 경고가 없다", () => {
    const items: PageSummary[] = [
      summary({ pageId: "p_pub", title: "공개", visibility: "PUBLIC" }),
    ];
    render(
      <MentionList
        items={items}
        command={vi.fn()}
        sourceVisibility={"PUBLIC" satisfies Visibility}
      />,
    );

    expect(warningSpansOf()).toHaveLength(0);
  });

  it("sourceVisibility 가 없으면 chip 은 보이지만 경고는 없다", () => {
    const items: PageSummary[] = [
      summary({ pageId: "p_draft", title: "초안", visibility: "DRAFT" }),
    ];
    render(<MentionList items={items} command={vi.fn()} />);

    expect(screen.getByLabelText("공개 범위: 초안")).toBeInTheDocument();
    expect(warningSpansOf()).toHaveLength(0);
  });

  it("PUBLIC source + MEMBER target 은 멤버 비공개 누설 경고를 띄운다", () => {
    const items: PageSummary[] = [
      summary({ pageId: "p_mem", title: "멤버 페이지", visibility: "MEMBER" }),
    ];
    render(
      <MentionList
        items={items}
        command={vi.fn()}
        sourceVisibility={"PUBLIC" satisfies Visibility}
      />,
    );

    expect(warningSpansOf()).toHaveLength(1);
    const option = screen.getByRole("option");
    const warningId = option.getAttribute("aria-describedby");
    const warningEl = warningId ? document.getElementById(warningId) : null;
    expect(warningEl?.textContent).toBe(
      "이 페이지는 멤버 공개 페이지입니다. 공개 페이지를 보는 일부 독자에게는 '비공개 페이지' 로 표시됩니다.",
    );
  });

  it("MEMBER source 는 INTERNAL / DRAFT target 모두에 경고를 띄운다", () => {
    const items: PageSummary[] = [
      summary({ pageId: "p_int", title: "내부", visibility: "INTERNAL" }),
      summary({ pageId: "p_draft", title: "초안", visibility: "DRAFT" }),
    ];
    render(
      <MentionList
        items={items}
        command={vi.fn()}
        sourceVisibility={"MEMBER" satisfies Visibility}
      />,
    );

    expect(warningSpansOf()).toHaveLength(2);
  });

  it("MEMBER source + PUBLIC target (위계 상승) 에는 경고가 없다", () => {
    const items: PageSummary[] = [
      summary({ pageId: "p_pub", title: "공개", visibility: "PUBLIC" }),
    ];
    render(
      <MentionList
        items={items}
        command={vi.fn()}
        sourceVisibility={"MEMBER" satisfies Visibility}
      />,
    );

    expect(warningSpansOf()).toHaveLength(0);
  });

  it("MEMBER source + MEMBER target (동일) 에는 경고가 없다", () => {
    const items: PageSummary[] = [
      summary({ pageId: "p_mem", title: "멤버 페이지", visibility: "MEMBER" }),
    ];
    render(
      <MentionList
        items={items}
        command={vi.fn()}
        sourceVisibility={"MEMBER" satisfies Visibility}
      />,
    );

    expect(warningSpansOf()).toHaveLength(0);
  });
});
