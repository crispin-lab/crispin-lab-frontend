import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { asPageId } from "@/lib/api/ids";
import type { Page, Space } from "@/lib/api/types";
import { pageBody } from "@/test/fixtures/page";
import { createQueryWrapper } from "@/test/queryWrapper";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// InboundLinkList / PageTagList / CommentThread 는 별도 테스트 (각자 *.test.tsx) 가 커버.
// PageReadingView 테스트가 QueryClient / MSW handler 의존 없이 단독 렌더되도록 stub.
vi.mock("./InboundLinkList", () => ({
  InboundLinkList: () => null,
}));
vi.mock("./PageTagList", () => ({
  PageTagList: () => null,
}));
const { commentThreadSpy } = vi.hoisted(() => ({ commentThreadSpy: vi.fn() }));
vi.mock("./CommentThread", () => ({
  CommentThread: (props: unknown) => {
    commentThreadSpy(props);
    return null;
  },
}));

import { PageReadingView } from "./PageReadingView";

function makeDoc(content: unknown[]): string {
  return JSON.stringify({ type: "doc", content });
}

function makePage(overrides: Partial<Page> = {}): Page {
  return pageBody({
    createdAt: "2026-05-22T10:00:00Z",
    updatedAt: "2026-05-22T10:00:00Z",
    title: "TipTap 위키 링크 구현 메모",
    authorHandle: "crispin",
    authorId: "u_01HX9Z8E0SECRET",
    currentVersion: 1,
    content: makeDoc([{ type: "paragraph", content: [{ type: "text", text: "본문" }] }]),
    ...overrides,
  });
}

function makeSpace(overrides: Partial<Space> = {}): Space {
  return {
    createdAt: "2026-01-01T00:00:00Z",
    spaceId: "s_1",
    visibility: "PUBLIC",
    name: "공개 위키",
    description: "공개 위키 설명",
    updatedAt: "2026-06-01T00:00:00Z",
    canWrite: true,
    ...overrides,
  };
}

function renderView({
  page,
  space,
  isAuthenticated,
  canEdit,
}: {
  page?: Page;
  space?: Space;
  isAuthenticated: boolean;
  // 명시 안 하면 기존 "isAuthenticated 면 편집 가능" 의미 유지 — 기존 테스트 케이스 호환.
  canEdit?: boolean;
}) {
  const value = page ?? makePage();
  // TaskItemSaveMounter 가 usePageUpdate (mutation hook) 을 사용 — QueryClientProvider 필수.
  const { Wrapper } = createQueryWrapper();
  return render(
    <PageReadingView
      page={value}
      pageId={asPageId(value.pageId)}
      space={space ?? makeSpace()}
      isAuthenticated={isAuthenticated}
      canEdit={canEdit ?? isAuthenticated}
    />,
    { wrapper: Wrapper },
  );
}

describe("PageReadingView", () => {
  it("CommentThread 에 pageId / spaceId / sourceVisibility / canComment 가 정확히 전달된다", () => {
    commentThreadSpy.mockReset();
    const page = makePage({ canComment: true, visibility: "PUBLIC" });
    const space = makeSpace({ spaceId: "s_42" });
    renderView({ page, space, isAuthenticated: true });

    expect(commentThreadSpy).toHaveBeenCalledTimes(1);
    const props = commentThreadSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(props.pageId).toBe("p_1");
    expect(props.spaceId).toBe("s_42");
    expect(props.sourceVisibility).toBe("PUBLIC");
    expect(props.canComment).toBe(true);
  });

  it("제목 / 저자 / 작성일 / visibility 가 메타 줄에 노출된다", () => {
    renderView({ isAuthenticated: false });

    expect(
      screen.getByRole("heading", { level: 1, name: "TipTap 위키 링크 구현 메모" }),
    ).toBeInTheDocument();
    expect(screen.getByText("@crispin")).toBeInTheDocument();
    // createdAt "2026-05-22T10:00:00Z" — KST (Asia/Seoul 고정) 로 렌더.
    expect(screen.getByText("2026. 05. 22. 19:00")).toBeInTheDocument();
    expect(screen.getByLabelText(/공개 범위/)).toBeInTheDocument();
  });

  it("authorId (raw UserId) 는 어디에도 노출되지 않는다", () => {
    const page = makePage();
    renderView({ page, isAuthenticated: false });

    // 본문·attr·aria-label 어디로도 새지 않는지 한 번에 가드 — fixture 의 authorId 가 바뀌어도 따라간다.
    expect(document.body.innerHTML).not.toContain(page.authorId);
  });

  it("authorHandle 이 빈 문자열이면 '@' 없이 '삭제된 사용자' 라벨이 노출된다", () => {
    renderView({ page: makePage({ authorHandle: "" }), isAuthenticated: false });

    const label = screen.getByText("삭제된 사용자");
    expect(label).toBeInTheDocument();
    expect(label.textContent).not.toMatch(/^@/);
  });

  it("비로그인 상태에서는 '편집' link 가 노출되지 않는다", () => {
    renderView({ isAuthenticated: false });

    expect(screen.queryByRole("link", { name: "편집" })).not.toBeInTheDocument();
  });

  it("로그인 상태에서는 '편집' link 가 /pages/{id}/edit 로 노출된다", () => {
    renderView({ isAuthenticated: true });

    const editLink = screen.getByRole("link", { name: "편집" });
    expect(editLink).toHaveAttribute("href", "/pages/p_1/edit");
  });

  it("로그인했지만 비편집자 (canEdit=false) 면 '편집' link 가 노출되지 않는다", () => {
    renderView({ isAuthenticated: true, canEdit: false });

    expect(screen.queryByRole("link", { name: "편집" })).not.toBeInTheDocument();
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

    const { container } = renderView({ page, isAuthenticated: false });
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

    const { container } = renderView({ page, isAuthenticated: false });
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

    renderView({ page, isAuthenticated: false });

    expect(screen.queryByRole("navigation", { name: "목차" })).not.toBeInTheDocument();
  });

  it("updatedAt 이 createdAt 과 다르면 '수정' 줄이 메타에 노출된다", () => {
    renderView({
      page: makePage({ updatedAt: "2026-05-30T10:00:00Z" }),
      isAuthenticated: false,
    });

    const updated = document.querySelector('time[datetime^="2026-05-30"]');
    expect(updated).not.toBeNull();
    expect(updated?.parentElement?.textContent).toMatch(/^수정 2026\. 05\. 30\./);
  });

  it("updatedAt 이 createdAt 과 같으면 '수정' 줄은 노출되지 않는다", () => {
    renderView({ isAuthenticated: false });

    expect(screen.queryByText(/^수정 /)).not.toBeInTheDocument();
  });

  it("본문이 비어 있으면 안내 문구가 본문 자리에 노출된다", () => {
    renderView({ page: makePage({ content: "" }), isAuthenticated: false });

    expect(screen.getByText("본문이 비어 있습니다.")).toBeInTheDocument();
    // PageLinkChipNavigator 의 click 위임 컨테이너도 본문 자리에서 사라진다.
    expect(document.querySelector("[data-page-link]")).toBeNull();
  });

  it("스페이스 chip 이 메타에 노출되며 /spaces/{id} 로 link 된다", () => {
    renderView({
      space: makeSpace({ spaceId: "s_42", name: "Engineering" }),
      isAuthenticated: false,
    });

    const chip = screen.getByRole("link", { name: "스페이스: Engineering" });
    expect(chip).toHaveAttribute("href", "/spaces/s_42");
  });

  it("스페이스 name 이 빈 문자열이면 chip 에 fallback 라벨이 노출된다", () => {
    renderView({ space: makeSpace({ name: "" }), isAuthenticated: false });

    expect(screen.getByRole("link", { name: "스페이스: 이름 없는 스페이스" })).toBeInTheDocument();
  });

  it("ancestors 가 비어 있으면 breadcrumb 가 노출되지 않는다", () => {
    renderView({ isAuthenticated: false });

    expect(screen.queryByRole("navigation", { name: "현재 페이지 경로" })).not.toBeInTheDocument();
  });

  it("ancestors 가 있으면 breadcrumb 에 스페이스 + 조상 link + 현재 페이지가 순서대로 노출된다", () => {
    const page = makePage({
      title: "현재 페이지",
      ancestors: [
        { pageId: "p_root", title: "루트 페이지" },
        { pageId: "p_parent", title: "직계 부모" },
      ],
    });
    renderView({
      page,
      space: makeSpace({ spaceId: "s_42", name: "Engineering" }),
      isAuthenticated: false,
    });

    const nav = screen.getByRole("navigation", { name: "현재 페이지 경로" });
    const current = within(nav).getByText("현재 페이지");
    expect(current).toHaveAttribute("aria-current", "page");
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute("href", "/spaces/s_42");
    expect(links[0].textContent).toBe("Engineering");
    expect(links[1]).toHaveAttribute("href", "/pages/p_root");
    expect(links[2]).toHaveAttribute("href", "/pages/p_parent");
  });
});
