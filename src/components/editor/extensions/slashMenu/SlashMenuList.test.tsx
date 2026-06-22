import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { SLASH_ITEMS } from "./items";
import { SlashMenuList, type SlashMenuListHandle } from "./SlashMenuList";

function keyEvent(key: string): { event: KeyboardEvent } {
  return { event: new KeyboardEvent("keydown", { key }) };
}

describe("SlashMenuList", () => {
  it("빈 items 는 안내 문구를 노출한다", () => {
    render(<SlashMenuList items={[]} onSelect={vi.fn()} />);
    expect(screen.getByText("일치하는 명령이 없습니다.")).toBeInTheDocument();
  });

  it("키보드 ArrowDown / ArrowUp 으로 선택을 순환한다", () => {
    const ref = createRef<SlashMenuListHandle>();
    render(<SlashMenuList ref={ref} items={SLASH_ITEMS.slice(0, 3)} onSelect={vi.fn()} />);

    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");

    act(() => {
      ref.current?.onKeyDown(keyEvent("ArrowDown"));
    });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");

    act(() => {
      ref.current?.onKeyDown(keyEvent("ArrowUp"));
      ref.current?.onKeyDown(keyEvent("ArrowUp"));
    });
    expect(screen.getAllByRole("option")[2]).toHaveAttribute("aria-selected", "true");
  });

  it("Enter 가 현재 선택된 아이템의 onSelect 를 호출한다", () => {
    const onSelect = vi.fn();
    const ref = createRef<SlashMenuListHandle>();
    const items = SLASH_ITEMS.slice(0, 3);
    render(<SlashMenuList ref={ref} items={items} onSelect={onSelect} />);

    act(() => {
      ref.current?.onKeyDown(keyEvent("ArrowDown"));
    });
    act(() => {
      ref.current?.onKeyDown(keyEvent("Enter"));
    });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(items[1]);
  });

  it("처리하지 않는 키는 false 를 반환한다 (suggestion plugin 이 위임 받지 않게)", () => {
    const ref = createRef<SlashMenuListHandle>();
    render(<SlashMenuList ref={ref} items={SLASH_ITEMS.slice(0, 1)} onSelect={vi.fn()} />);
    expect(ref.current?.onKeyDown(keyEvent("a"))).toBe(false);
  });

  it("키보드 선택 변경 시 활성 li 의 scrollIntoView 가 호출된다", () => {
    // vitest.setup.ts 의 no-op 위에 spy 를 얹은 뒤 finally 로 복구 — 후속 테스트에 전역 오염이 새지 않게.
    const scrollIntoView = vi.fn();
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      window.HTMLElement.prototype,
      "scrollIntoView",
    );
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: scrollIntoView,
    });

    try {
      const ref = createRef<SlashMenuListHandle>();
      render(<SlashMenuList ref={ref} items={SLASH_ITEMS.slice(0, 5)} onSelect={vi.fn()} />);

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenLastCalledWith({ block: "nearest" });

      act(() => {
        ref.current?.onKeyDown(keyEvent("ArrowDown"));
      });
      expect(scrollIntoView).toHaveBeenCalledTimes(2);
      act(() => {
        ref.current?.onKeyDown(keyEvent("ArrowDown"));
      });
      expect(scrollIntoView).toHaveBeenCalledTimes(3);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", originalDescriptor);
      }
    }
  });
});
