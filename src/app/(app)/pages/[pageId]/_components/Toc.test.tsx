import { act, render, screen, within, type RenderResult } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { lastIntersectionObserver } from "@/test/intersectionObserver";

import { Toc, type TocItem } from "./Toc";

const ITEMS: TocItem[] = [
  { id: "toc-0", level: 1, text: "노드 구조" },
  { id: "toc-1", level: 2, text: "백엔드 매핑" },
  { id: "toc-2", level: 2, text: "마이그레이션" },
];

// useActiveHeading 이 document.getElementById 로 element 를 찾으므로 Toc 와 같은 트리에 mount. heading level 도 TocItem.level 과 정합시켜 향후 padding 회귀 fixture 의 신뢰성 유지.
function HeadingElement({ item }: { item: TocItem }): React.JSX.Element {
  if (item.level === 1) return <h1 id={item.id}>{item.text}</h1>;
  if (item.level === 2) return <h2 id={item.id}>{item.text}</h2>;
  return <h3 id={item.id}>{item.text}</h3>;
}

function renderToc(): RenderResult {
  return render(
    <>
      {ITEMS.map((item) => (
        <HeadingElement key={item.id} item={item} />
      ))}
      <Toc items={ITEMS} />
    </>,
  );
}

function headingEl(text: string): HTMLElement {
  return screen.getByRole("heading", { name: text });
}

describe("Toc", () => {
  it("active heading 이 없으면 어떤 link 도 data-active 가 없다", () => {
    renderToc();
    const nav = screen.getByRole("navigation", { name: "목차" });
    const links = within(nav).getAllByRole("link");

    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link).not.toHaveAttribute("data-active");
    }
  });

  it("첫 heading 이 visible 이 되면 그 link 만 data-active='true' 를 갖는다", () => {
    renderToc();
    const nav = screen.getByRole("navigation", { name: "목차" });
    const links = within(nav).getAllByRole("link");

    act(() => {
      lastIntersectionObserver().trigger([
        { target: headingEl("노드 구조"), isIntersecting: true },
      ]);
    });

    expect(links[0]).toHaveAttribute("data-active", "true");
    expect(links[1]).not.toHaveAttribute("data-active");
    expect(links[2]).not.toHaveAttribute("data-active");
  });

  it("active 가 다른 heading 으로 전환되면 이전 link 의 data-active 가 제거된다", () => {
    renderToc();
    const nav = screen.getByRole("navigation", { name: "목차" });
    const links = within(nav).getAllByRole("link");
    const io = lastIntersectionObserver();

    act(() => {
      io.trigger([{ target: headingEl("노드 구조"), isIntersecting: true }]);
    });
    expect(links[0]).toHaveAttribute("data-active", "true");

    act(() => {
      io.trigger([
        { target: headingEl("노드 구조"), isIntersecting: false },
        { target: headingEl("백엔드 매핑"), isIntersecting: true },
      ]);
    });

    expect(links[0]).not.toHaveAttribute("data-active");
    expect(links[1]).toHaveAttribute("data-active", "true");
    expect(links[2]).not.toHaveAttribute("data-active");
  });
});
