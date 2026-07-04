import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { asUserId } from "@/lib/api/ids";
import type { UserSummary } from "@/lib/api/types";

import {
  MENTION_USER_LISTBOX_ID,
  MentionUserList,
  type MentionUserListHandle,
} from "./MentionUserList";

function user(userId: string, handle: string): UserSummary {
  return { userId: asUserId(userId), handle, memberOfSpaceIds: [] };
}

function makeItems(): UserSummary[] {
  return [user("u_a", "alice"), user("u_b", "alice_kim"), user("u_c", "bob")];
}

function keyEvent(key: string): { event: KeyboardEvent } {
  return { event: new KeyboardEvent("keydown", { key }) };
}

describe("MentionUserList", () => {
  it("결과가 비어 있으면 안내 문구를 보여주고 어떤 키도 처리하지 않는다", () => {
    const ref = createRef<MentionUserListHandle>();
    render(<MentionUserList ref={ref} items={[]} command={vi.fn()} />);

    expect(screen.getByText("사용자를 찾을 수 없습니다.")).toBeInTheDocument();
    expect(ref.current?.onKeyDown(keyEvent("Enter"))).toBe(false);
    expect(ref.current?.onKeyDown(keyEvent("ArrowDown"))).toBe(false);
  });

  it("처음에는 첫 항목이 선택되고 ArrowDown 으로 순환한다", () => {
    const ref = createRef<MentionUserListHandle>();
    render(<MentionUserList ref={ref} items={makeItems()} command={vi.fn()} />);

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
    render(<MentionUserList ref={ref} items={makeItems()} command={vi.fn()} />);

    act(() => {
      ref.current?.onKeyDown(keyEvent("ArrowUp"));
    });
    expect(screen.getAllByRole("option")[2]).toHaveAttribute("aria-selected", "true");
  });

  it("Enter 가 현재 선택된 항목을 command 로 전달한다", () => {
    const ref = createRef<MentionUserListHandle>();
    const command = vi.fn();
    render(<MentionUserList ref={ref} items={makeItems()} command={command} />);

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
    render(<MentionUserList ref={ref} items={makeItems()} command={vi.fn()} />);

    expect(ref.current?.onKeyDown(keyEvent("Escape"))).toBe(false);
    expect(ref.current?.onKeyDown(keyEvent("a"))).toBe(false);
  });

  it("items 가 바뀌면 remount key 로 selectedIndex 가 0 으로 초기화된다", () => {
    const ref = createRef<MentionUserListHandle>();
    const { rerender } = render(
      <MentionUserList ref={ref} items={makeItems()} command={vi.fn()} />,
    );

    act(() => {
      ref.current?.onKeyDown(keyEvent("ArrowDown"));
      ref.current?.onKeyDown(keyEvent("ArrowDown"));
    });
    expect(screen.getAllByRole("option")[2]).toHaveAttribute("aria-selected", "true");

    // 검색어가 좁혀져 결과가 바뀌면 커서는 첫 항목으로 되돌아가야 한다 (사용자 관점 정합).
    rerender(<MentionUserList ref={ref} items={[user("u_x", "xavier")]} command={vi.fn()} />);

    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
  });

  it("listbox 와 각 option 에 안정적인 id 를 부여한다 (aria-activedescendant 연결용)", () => {
    render(<MentionUserList items={makeItems()} command={vi.fn()} />);

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
        onActiveOptionIdChange={onActiveOptionIdChange}
      />,
    );

    expect(onActiveOptionIdChange).toHaveBeenCalledWith(null);
  });
});
