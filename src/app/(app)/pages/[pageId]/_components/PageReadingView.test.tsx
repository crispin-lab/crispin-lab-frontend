import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Page } from "@/lib/api/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { PageReadingView } from "./PageReadingView";

function makeDoc(content: unknown[]): string {
  return JSON.stringify({ type: "doc", content });
}

function makePage(overrides: Partial<Page> = {}): Page {
  return {
    createdAt: "2026-05-22T10:00:00Z",
    spaceId: "s_1",
    visibility: "PUBLIC",
    parentPageId: null,
    displayOrder: 0,
    ancestors: [],
    title: "TipTap 위키 링크 구현 메모",
    authorId: "u_crispin",
    pageId: "p_1",
    currentVersion: 1,
    content: makeDoc([{ type: "paragraph", content: [{ type: "text", text: "본문" }] }]),
    updatedAt: "2026-05-22T10:00:00Z",
    ...overrides,
  };
}

describe("PageReadingView", () => {
  it("제목 / 저자 / 작성일 / visibility 가 메타 줄에 노출된다", () => {
    render(<PageReadingView page={makePage()} isAuthenticated={false} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "TipTap 위키 링크 구현 메모" }),
    ).toBeInTheDocument();
    expect(screen.getByText("@u_crispin")).toBeInTheDocument();
    expect(screen.getByText("2026. 05. 22.")).toBeInTheDocument();
    expect(screen.getByLabelText(/공개 범위/)).toBeInTheDocument();
  });

  it("비로그인 상태에서는 '편집' link 가 노출되지 않는다", () => {
    render(<PageReadingView page={makePage()} isAuthenticated={false} />);

    expect(screen.queryByRole("link", { name: "편집" })).not.toBeInTheDocument();
  });

  it("로그인 상태에서는 '편집' link 가 /pages/{id}/edit 로 노출된다", () => {
    render(<PageReadingView page={makePage()} isAuthenticated={true} />);

    const editLink = screen.getByRole("link", { name: "편집" });
    expect(editLink).toHaveAttribute("href", "/pages/p_1/edit");
  });

  it("PageLink 노드는 chip 으로 렌더링되며 data-page-id 와 role=link 를 갖는다", () => {
    const page = makePage({
      content: makeDoc([
        {
          type: "paragraph",
          content: [
            { type: "text", text: "본 페이지는 " },
            { type: "pageLink", attrs: { pageId: "p_meeting", displayText: "회의록" } },
            { type: "text", text: " 에서 파생됐다." },
          ],
        },
      ]),
    });

    const { container } = render(<PageReadingView page={page} isAuthenticated={false} />);
    const chip = container.querySelector("[data-page-link]");

    expect(chip).not.toBeNull();
    expect(chip?.getAttribute("data-page-id")).toBe("p_meeting");
    expect(chip?.getAttribute("role")).toBe("link");
    expect(chip?.getAttribute("tabindex")).toBe("0");
    expect(chip?.textContent).toBe("회의록");
  });

  it("heading 이 3 개 이상이면 우측 TOC 가 노출되고 anchor 가 본문 heading id 와 매칭된다", () => {
    const page = makePage({
      content: makeDoc([
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "노드 구조" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "백엔드 매핑" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "마이그레이션" }] },
      ]),
    });

    const { container } = render(<PageReadingView page={page} isAuthenticated={false} />);
    const toc = screen.getByRole("navigation", { name: "목차" });

    const links = within(toc).getAllByRole("link");
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute("href", "#toc-0");
    expect(links[2]).toHaveAttribute("href", "#toc-2");

    expect(container.querySelector("#toc-0")?.textContent).toBe("노드 구조");
    expect(container.querySelector("#toc-2")?.textContent).toBe("마이그레이션");
  });

  it("heading 이 3 개 미만이면 TOC 가 노출되지 않는다", () => {
    const page = makePage({
      content: makeDoc([
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "단일" }] },
        { type: "paragraph", content: [{ type: "text", text: "본문" }] },
      ]),
    });

    render(<PageReadingView page={page} isAuthenticated={false} />);

    expect(screen.queryByRole("navigation", { name: "목차" })).not.toBeInTheDocument();
  });

  it("updatedAt 이 createdAt 과 다르면 '수정' 줄이 메타에 노출된다", () => {
    render(
      <PageReadingView
        page={makePage({ updatedAt: "2026-05-30T10:00:00Z" })}
        isAuthenticated={false}
      />,
    );

    expect(screen.getByText(/수정 2026\. 05\. 30\./)).toBeInTheDocument();
  });

  it("updatedAt 이 createdAt 과 같으면 '수정' 줄은 노출되지 않는다", () => {
    render(<PageReadingView page={makePage()} isAuthenticated={false} />);

    expect(screen.queryByText(/^수정 /)).not.toBeInTheDocument();
  });

  it("본문이 비어 있으면 안내 문구가 본문 자리에 노출된다", () => {
    render(<PageReadingView page={makePage({ content: "" })} isAuthenticated={false} />);

    expect(screen.getByText("본문이 비어 있습니다.")).toBeInTheDocument();
    // PageLinkChipNavigator 의 click 위임 컨테이너도 본문 자리에서 사라진다.
    expect(document.querySelector("[data-page-link]")).toBeNull();
  });
});
