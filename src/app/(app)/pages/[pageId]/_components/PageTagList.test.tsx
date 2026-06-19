import { render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { asPageId } from "@/lib/api/ids";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/queryWrapper";

import { PageTagList } from "./PageTagList";

const PAGE_ID = asPageId("p_1");

function buildBody(items: Array<{ tagId: string; name: string }>) {
  return {
    size: 20,
    isEmpty: items.length === 0,
    totalPages: items.length === 0 ? 0 : 1,
    hasNext: false,
    page: 0,
    totalElements: items.length,
    items: items.map((t) => ({
      ...t,
      spaceId: "s_1",
      createdAt: "2026-06-01T00:00:00Z",
    })),
  };
}

function renderList() {
  const { Wrapper } = createQueryWrapper();
  return render(<PageTagList pageId={PAGE_ID} />, { wrapper: Wrapper });
}

describe("PageTagList", () => {
  it("부착된 태그가 있으면 각 chip 이 /search?tag=tagId (encoded) 로 link 된다", async () => {
    // BE 가 /v1/pages?tag= 에서 tagId 만 받는다 — name 으로 보내면 400 INVALID_REQUEST.
    server.use(
      http.get(`*/api/v1/pages/${PAGE_ID}/tags`, () =>
        HttpResponse.json(
          buildBody([
            { tagId: "t_1", name: "frontend" },
            { tagId: "t_복합/위키", name: "위키" },
          ]),
        ),
      ),
    );

    renderList();

    const frontend = await screen.findByRole("link", { name: /#frontend/ });
    expect(frontend).toHaveAttribute("href", "/search?tag=t_1");

    const wiki = screen.getByRole("link", { name: /#위키/ });
    expect(wiki).toHaveAttribute("href", `/search?tag=${encodeURIComponent("t_복합/위키")}`);
  });

  it("항목이 없으면 아무것도 렌더하지 않는다", async () => {
    server.use(http.get(`*/api/v1/pages/${PAGE_ID}/tags`, () => HttpResponse.json(buildBody([]))));

    const { container } = renderList();
    await waitFor(() => expect(container.querySelector("ul")).toBeNull());
  });

  it("에러면 row 자체를 그리지 않는다", async () => {
    server.use(
      http.get(`*/api/v1/pages/${PAGE_ID}/tags`, () =>
        HttpResponse.json(
          { code: "INTERNAL_ERROR", message: "태그를 불러오지 못했습니다." },
          { status: 500 },
        ),
      ),
    );

    const { container } = renderList();
    await waitFor(() => expect(container.querySelector("ul")).toBeNull());
  });
});
