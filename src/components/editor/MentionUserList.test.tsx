import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { asSpaceId, asUserId } from "@/lib/api/ids";
import type { MentionCandidateSummary } from "@/lib/api/types";
import type { MentionContext } from "@/lib/mention/context";

import {
  MENTION_USER_LISTBOX_ID,
  MentionUserList,
  type MentionUserListHandle,
} from "./MentionUserList";

function candidate(userId: string, handle: string): MentionCandidateSummary {
  return { userId: asUserId(userId), handle };
}

function makeItems(): MentionCandidateSummary[] {
  return [candidate("u_a", "alice"), candidate("u_b", "alice_kim"), candidate("u_c", "bob")];
}

function contextFixture(overrides: Partial<MentionContext> = {}): MentionContext {
  return {
    spaceId: asSpaceId("s_1"),
    spaceVisibility: "PUBLIC",
    pageVisibility: "PUBLIC",
    pageAuthorId: asUserId("u_author"),
    ...overrides,
  };
}

function keyEvent(key: string): { event: KeyboardEvent } {
  return { event: new KeyboardEvent("keydown", { key }) };
}

describe("MentionUserList", () => {
  it("결과가 비어 있으면 안내 문구를 보여주고 어떤 키도 처리하지 않는다", () => {
    const ref = createRef<MentionUserListHandle>();
    render(
      <MentionUserList ref={ref} items={[]} command={vi.fn()} mentionContext={contextFixture()} />,
    );

    expect(screen.getByText(/찾을 수 없어요/)).toBeInTheDocument();
    expect(ref.current?.onKeyDown(keyEvent("Enter"))).toBe(false);
    expect(ref.current?.onKeyDown(keyEvent("ArrowDown"))).toBe(false);
  });

  it("DRAFT 페이지에서 결과가 0건이면 초안 안내 문구를 보여준다", () => {
    render(
      <MentionUserList
        items={[]}
        command={vi.fn()}
        mentionContext={contextFixture({ pageVisibility: "DRAFT" })}
      />,
    );

    expect(screen.getByText("이 페이지는 초안이라 언급 대상이 없어요.")).toBeInTheDocument();
  });

  it("INTERNAL 페이지에서 결과가 0건이면 비공개 안내 문구를 보여준다", () => {
    render(
      <MentionUserList
        items={[]}
        command={vi.fn()}
        mentionContext={contextFixture({ pageVisibility: "INTERNAL" })}
      />,
    );

    expect(screen.getByText("이 페이지는 비공개라 언급 대상이 없어요.")).toBeInTheDocument();
  });

  it("컨텍스트가 아직 조립되지 않았으면 로딩 안내 문구를 보여준다 (fail-closed)", () => {
    render(<MentionUserList items={[]} command={vi.fn()} mentionContext={null} />);

    expect(screen.getByText("페이지 정보를 불러오고 있어요.")).toBeInTheDocument();
  });

  it("처음에는 첫 항목이 선택되고 ArrowDown 으로 순환한다", () => {
    const ref = createRef<MentionUserListHandle>();
    render(
      <MentionUserList
        ref={ref}
        items={makeItems()}
        command={vi.fn()}
        mentionContext={contextFixture()}
      />,
    );

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

  it("ArrowUp 으로 역방향 순환한다", () => {
    const ref = createRef<MentionUserListHandle>();
    render(
      <MentionUserList
        ref={ref}
        items={makeItems()}
        command={vi.fn()}
        mentionContext={contextFixture()}
      />,
    );

    act(() => {
      ref.current?.onKeyDown(keyEvent("ArrowUp"));
    });
    expect(screen.getAllByRole("option")[2]).toHaveAttribute("aria-selected", "true");
  });

  it("Enter 가 현재 선택된 항목을 command 로 전달한다", () => {
    const ref = createRef<MentionUserListHandle>();
    const command = vi.fn();
    render(
      <MentionUserList
        ref={ref}
        items={makeItems()}
        command={command}
        mentionContext={contextFixture()}
      />,
    );

    act(() => {
      ref.current?.onKeyDown(keyEvent("ArrowDown"));
    });
    act(() => {
      ref.current?.onKeyDown(keyEvent("Enter"));
    });

    expect(command).toHaveBeenCalledWith({ id: asUserId("u_b"), label: "alice_kim" });
  });

  it("처리하지 않는 키는 false 를 반환해 상위 핸들러로 흘려보낸다", () => {
    const ref = createRef<MentionUserListHandle>();
    render(
      <MentionUserList
        ref={ref}
        items={makeItems()}
        command={vi.fn()}
        mentionContext={contextFixture()}
      />,
    );

    expect(ref.current?.onKeyDown(keyEvent("Escape"))).toBe(false);
    expect(ref.current?.onKeyDown(keyEvent("a"))).toBe(false);
  });

  it("items 가 바뀌면 remount key 로 selectedIndex 가 0 으로 초기화된다", () => {
    const ref = createRef<MentionUserListHandle>();
    const { rerender } = render(
      <MentionUserList
        ref={ref}
        items={makeItems()}
        command={vi.fn()}
        mentionContext={contextFixture()}
      />,
    );

    act(() => {
      ref.current?.onKeyDown(keyEvent("ArrowDown"));
      ref.current?.onKeyDown(keyEvent("ArrowDown"));
    });
    expect(screen.getAllByRole("option")[2]).toHaveAttribute("aria-selected", "true");

    // 검색어가 좁혀져 결과가 바뀌면 커서는 첫 항목으로 되돌아가야 한다 (사용자 관점 정합).
    rerender(
      <MentionUserList
        ref={ref}
        items={[candidate("u_x", "xavier")]}
        command={vi.fn()}
        mentionContext={contextFixture()}
      />,
    );

    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
  });

  it("listbox 와 각 option 에 안정적인 id 를 부여한다 (aria-activedescendant 연결용)", () => {
    render(
      <MentionUserList items={makeItems()} command={vi.fn()} mentionContext={contextFixture()} />,
    );

    expect(screen.getByRole("listbox").id).toBe(MENTION_USER_LISTBOX_ID);
    const options = screen.getAllByRole("option");
    expect(options[0].id).toBe("mention-option-u_a");
    expect(options[1].id).toBe("mention-option-u_b");
    expect(options[2].id).toBe("mention-option-u_c");
  });

  it("onActiveOptionIdChange 가 초기 강조 옵션 id 를 전달한다", () => {
    const onActiveOptionIdChange = vi.fn();
    render(
      <MentionUserList
        items={makeItems()}
        command={vi.fn()}
        mentionContext={contextFixture()}
        onActiveOptionIdChange={onActiveOptionIdChange}
      />,
    );

    expect(onActiveOptionIdChange).toHaveBeenCalledWith("mention-option-u_a");
  });

  it("onActiveOptionIdChange 가 ArrowDown 이후 새 강조 옵션 id 를 전달한다", () => {
    const onActiveOptionIdChange = vi.fn();
    const ref = createRef<MentionUserListHandle>();
    render(
      <MentionUserList
        ref={ref}
        items={makeItems()}
        command={vi.fn()}
        mentionContext={contextFixture()}
        onActiveOptionIdChange={onActiveOptionIdChange}
      />,
    );

    onActiveOptionIdChange.mockClear();
    act(() => {
      ref.current?.onKeyDown(keyEvent("ArrowDown"));
    });

    expect(onActiveOptionIdChange).toHaveBeenCalledWith("mention-option-u_b");
  });

  it("빈 결과에서는 onActiveOptionIdChange 가 null 을 전달한다", () => {
    const onActiveOptionIdChange = vi.fn();
    render(
      <MentionUserList
        items={[]}
        command={vi.fn()}
        mentionContext={contextFixture()}
        onActiveOptionIdChange={onActiveOptionIdChange}
      />,
    );

    expect(onActiveOptionIdChange).toHaveBeenCalledWith(null);
  });
});
