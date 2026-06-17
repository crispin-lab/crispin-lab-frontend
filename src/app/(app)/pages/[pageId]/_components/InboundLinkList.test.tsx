import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { asPageId } from "@/lib/api/ids";
import type { PageInboundLink, PageInboundLinkListResult } from "@/lib/api/types";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/queryWrapper";

import { InboundLinkList } from "./InboundLinkList";

function inboundBody(items: PageInboundLink[]): PageInboundLinkListResult {
  return {
    size: 20,
    isEmpty: items.length === 0,
    totalPages: items.length === 0 ? 0 : 1,
    hasNext: false,
    page: 0,
    items,
    totalElements: items.length,
  };
}

function makeSource(overrides: Partial<PageInboundLink> = {}): PageInboundLink {
  return {
    pageId: "p_src_1",
    spaceId: "s_1",
    parentPageId: null,
    authorId: "u_1",
    authorHandle: "alice",
    title: "이전 회고",
    visibility: "PUBLIC",
    displayOrder: 0,
    updatedAt: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

function spaceListBody(spaces: Array<{ spaceId: string; name: string }>) {
  return {
    size: 100,
    isEmpty: spaces.length === 0,
    totalPages: spaces.length === 0 ? 0 : 1,
    hasNext: false,
    page: 0,
    items: spaces.map((s) => ({
      spaceId: s.spaceId,
      name: s.name,
      description: "",
      visibility: "PUBLIC",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    })),
    totalElements: spaces.length,
  };
}

describe("InboundLinkList", () => {
  it("빈 결과면 섹션 자체가 노출되지 않는다 (heading 부재)", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1/inbound", () => HttpResponse.json(inboundBody([]))),
      http.get("*/api/v1/spaces", () => HttpResponse.json(spaceListBody([]))),
    );

    const { Wrapper } = createQueryWrapper();
    const { container } = render(<InboundLinkList pageId={asPageId("p_1")} />, {
      wrapper: Wrapper,
    });

    // pending skeleton 의 status 와 heading 이 사라지고 컴포넌트가 null 로 떨어지는지 가드.
    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole("heading", { name: "이 페이지로 들어오는 링크" }),
    ).not.toBeInTheDocument();
    expect(container.querySelector("section")).toBeNull();
  });

  it("결과가 있으면 row 별 title / spaceName / @authorHandle / 날짜 / href 가 노출된다", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1/inbound", () =>
        HttpResponse.json(
          inboundBody([
            makeSource({ pageId: "p_src_1", spaceId: "s_1", title: "이전 회고" }),
            makeSource({
              pageId: "p_src_2",
              spaceId: "s_2",
              title: "분기 회고",
              authorHandle: "bob",
              updatedAt: "2026-06-10T00:00:00Z",
            }),
          ]),
        ),
      ),
      http.get("*/api/v1/spaces", () =>
        HttpResponse.json(
          spaceListBody([
            { spaceId: "s_1", name: "공개 위키" },
            { spaceId: "s_2", name: "엔지니어링" },
          ]),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<InboundLinkList pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    // success 의 <ul aria-label> 가 skeleton 의 status list 와 구분되는 안정 신호.
    const list = await screen.findByRole("list", { name: "이 페이지로 들어오는 링크" });
    expect(screen.getByRole("heading", { name: "이 페이지로 들어오는 링크" })).toBeInTheDocument();

    const rows = within(list).getAllByRole("listitem");
    expect(rows.length).toBe(2);

    const firstLink = within(rows[0]).getByRole("link");
    expect(firstLink).toHaveAttribute("href", "/pages/p_src_1");
    expect(within(rows[0]).getByText("이전 회고")).toBeInTheDocument();
    expect(within(rows[0]).getByText("공개 위키")).toBeInTheDocument();
    expect(within(rows[0]).getByText("@alice")).toBeInTheDocument();

    const secondLink = within(rows[1]).getByRole("link");
    expect(secondLink).toHaveAttribute("href", "/pages/p_src_2");
    expect(within(rows[1]).getByText("엔지니어링")).toBeInTheDocument();
    expect(within(rows[1]).getByText("@bob")).toBeInTheDocument();
  });

  it("authorHandle 이 빈 문자열인 source 는 '삭제된 사용자' 라벨로 노출된다", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1/inbound", () =>
        HttpResponse.json(inboundBody([makeSource({ authorHandle: "" })])),
      ),
      http.get("*/api/v1/spaces", () =>
        HttpResponse.json(spaceListBody([{ spaceId: "s_1", name: "공개 위키" }])),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<InboundLinkList pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    await screen.findByRole("list", { name: "이 페이지로 들어오는 링크" });
    expect(screen.getByText("삭제된 사용자")).toBeInTheDocument();
    expect(screen.queryByText(/^@/)).not.toBeInTheDocument();
  });

  it("loading 상태에서 skeleton (role=status) 이 노출된다", async () => {
    // 응답을 보내지 않아 pending 으로 멈춤. unhandled 경고 회피 위해 핸들러는 등록.
    server.use(
      http.get("*/api/v1/pages/p_1/inbound", async () => {
        await new Promise(() => {
          /* never resolves within test */
        });
        return HttpResponse.json(inboundBody([]));
      }),
      http.get("*/api/v1/spaces", () => HttpResponse.json(spaceListBody([]))),
    );

    const { Wrapper } = createQueryWrapper();
    render(<InboundLinkList pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    expect(await screen.findByRole("status", { name: /불러오는 중/ })).toBeInTheDocument();
  });

  it("에러 분기에서 메시지 + 재시도 버튼이 노출된다", async () => {
    const user = userEvent.setup();
    let attempts = 0;
    server.use(
      http.get("*/api/v1/pages/p_1/inbound", () => {
        attempts += 1;
        return HttpResponse.json(
          { code: "INTERNAL_ERROR", message: "잠시 후 다시 시도해 주세요." },
          { status: 500 },
        );
      }),
      http.get("*/api/v1/spaces", () => HttpResponse.json(spaceListBody([]))),
    );

    const { Wrapper } = createQueryWrapper();
    render(<InboundLinkList pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    expect(await screen.findByText("잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: /다시 시도/ });
    await user.click(retry);
    expect(attempts).toBeGreaterThanOrEqual(2);
  });
});
