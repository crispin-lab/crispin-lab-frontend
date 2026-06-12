import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import type { PageSummary } from "@/lib/api/types";
import type { Visibility } from "@/lib/page/visibility";

import { MentionList, NARROWER_WARNING_TRIGGER_LABEL, type MentionListHandle } from "./MentionList";

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

const WARNING_LABEL = NARROWER_WARNING_TRIGGER_LABEL;

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

  it("source 보다 좁은 target 항목에는 경고 아이콘이 표시된다", () => {
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

    expect(screen.getAllByLabelText(WARNING_LABEL)).toHaveLength(2);
  });

  it("hover 시 source 와 target 의 visibility 가 메시지에 반영된다", async () => {
    const user = userEvent.setup();
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

    await user.hover(screen.getByLabelText(WARNING_LABEL));

    await waitFor(() => {
      expect(
        screen.getByText(
          "이 페이지는 초안 페이지입니다. 비공개 페이지를 보는 일부 독자에게는 '비공개 페이지' 로 표시됩니다.",
        ),
      ).toBeInTheDocument();
    });
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

    expect(screen.queryByLabelText(WARNING_LABEL)).not.toBeInTheDocument();
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

    expect(screen.queryByLabelText(WARNING_LABEL)).not.toBeInTheDocument();
  });

  it("sourceVisibility 가 없으면 chip 은 보이지만 경고는 없다", () => {
    const items: PageSummary[] = [
      summary({ pageId: "p_draft", title: "초안", visibility: "DRAFT" }),
    ];
    render(<MentionList items={items} command={vi.fn()} />);

    expect(screen.getByLabelText("공개 범위: 초안")).toBeInTheDocument();
    expect(screen.queryByLabelText(WARNING_LABEL)).not.toBeInTheDocument();
  });
});
