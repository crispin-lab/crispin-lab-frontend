import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { asPageId, asSpaceId } from "@/lib/api/ids";
import type { PageSearchResult, PageSummary } from "@/lib/api/types";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/queryWrapper";

import { ParentPagePicker } from "./ParentPagePicker";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const SPACE = asSpaceId("s_1");

function pageSummary(overrides: Partial<PageSummary> = {}): PageSummary {
  return {
    spaceId: "s_1",
    visibility: "PUBLIC",
    parentPageId: null,
    displayOrder: 0,
    authorHandle: "crispin",
    title: "페이지",
    authorId: "u_1",
    pageId: "p_1",
    updatedAt: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

function pageSearchBody(items: PageSummary[]): PageSearchResult {
  return {
    size: 20,
    isEmpty: items.length === 0,
    totalPages: 1,
    hasNext: false,
    page: 0,
    items,
    totalElements: items.length,
  };
}

function renderPicker(value: { pageId: string; title: string } | null = null) {
  const onChange = vi.fn();
  const { Wrapper } = createQueryWrapper();
  const result = render(<ParentPagePicker spaceId={SPACE} value={value} onChange={onChange} />, {
    wrapper: Wrapper,
  });
  return { onChange, ...result };
}

describe("ParentPagePicker", () => {
  beforeEach(() => {
    server.use(
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          pageSearchBody([
            pageSummary({ pageId: "p_alpha", title: "알파" }),
            pageSummary({ pageId: "p_beta", title: "베타" }),
            pageSummary({ pageId: "p_gamma", title: "감마" }),
          ]),
        ),
      ),
    );
  });

  it("디폴트 trigger 라벨은 '선택 안 함 (루트)' 다", () => {
    renderPicker();
    expect(screen.getByRole("button", { name: "부모 페이지 선택" })).toHaveTextContent(
      "선택 안 함 (루트)",
    );
  });

  it("value 가 있으면 trigger 가 페이지 제목을 노출한다", () => {
    renderPicker({ pageId: "p_parent", title: "회의록" });
    expect(screen.getByRole("button", { name: "부모 페이지 선택" })).toHaveTextContent("회의록");
  });

  it("열고 옵션을 클릭하면 onChange 가 발화한다", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker();

    await user.click(screen.getByRole("button", { name: "부모 페이지 선택" }));
    const option = await screen.findByRole("option", { name: "알파" });
    await user.click(option);

    expect(onChange).toHaveBeenCalledWith({ pageId: "p_alpha", title: "알파" });
  });

  it("ArrowDown + Enter 로 두 번째 항목이 선택된다", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker();

    await user.click(screen.getByRole("button", { name: "부모 페이지 선택" }));
    await screen.findByRole("option", { name: "알파" });

    const input = screen.getByLabelText("부모 페이지 검색");
    input.focus();
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith({ pageId: "p_beta", title: "베타" });
  });

  it("IME composition 중 Enter 는 선택을 트리거하지 않는다", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker();

    await user.click(screen.getByRole("button", { name: "부모 페이지 선택" }));
    await screen.findByRole("option", { name: "알파" });

    const input = screen.getByLabelText("부모 페이지 검색");
    input.focus();
    // user-event 의 keydown 은 isComposing 을 시뮬레이션하기 까다로워 fireEvent 로 직접.
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("빈 결과 메시지", async () => {
    server.use(http.get("*/api/v1/pages", () => HttpResponse.json(pageSearchBody([]))));
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("button", { name: "부모 페이지 선택" }));
    expect(await screen.findByText("일치하는 페이지가 없습니다.")).toBeInTheDocument();
  });

  it("error 분기는 백엔드 message 로 alert 를 노출한다", async () => {
    server.use(
      http.get("*/api/v1/pages", () =>
        HttpResponse.json({ code: "X", message: "잠시 후 다시 시도해 주세요." }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("button", { name: "부모 페이지 선택" }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("잠시 후 다시 시도해 주세요.");
    });
  });

  it("value 가 있을 때 '선택 해제' 가 onChange(null) 을 호출한다", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker({ pageId: "p_parent", title: "회의록" });

    await user.click(screen.getByRole("button", { name: "부모 페이지 선택" }));
    await user.click(await screen.findByRole("button", { name: /선택 해제/ }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("excludePageIds 에 포함된 page 는 후보 리스트에서 제외된다", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { Wrapper } = createQueryWrapper();
    render(
      <ParentPagePicker
        spaceId={SPACE}
        value={null}
        onChange={onChange}
        excludePageIds={[asPageId("p_beta")]}
      />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByRole("button", { name: "부모 페이지 선택" }));
    await screen.findByRole("option", { name: "알파" });
    expect(screen.queryByRole("option", { name: "베타" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "감마" })).toBeInTheDocument();
  });
});
