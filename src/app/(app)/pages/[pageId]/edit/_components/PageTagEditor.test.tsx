import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { asPageId, asSpaceId } from "@/lib/api/ids";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/queryWrapper";

import { PageTagEditor } from "./PageTagEditor";

const PAGE_ID = asPageId("p_1");
const SPACE_ID = asSpaceId("s_1");

function pageTagListBody(items: Array<{ tagId: string; name: string }>) {
  return {
    size: 20,
    isEmpty: items.length === 0,
    totalPages: items.length === 0 ? 0 : 1,
    hasNext: false,
    page: 0,
    totalElements: items.length,
    items: items.map((t) => ({
      ...t,
      spaceId: SPACE_ID,
      createdAt: "2026-06-01T00:00:00Z",
    })),
  };
}

function spaceTagListBody(items: Array<{ tagId: string; name: string }>) {
  return {
    size: 100,
    isEmpty: items.length === 0,
    totalPages: items.length === 0 ? 0 : 1,
    hasNext: false,
    page: 0,
    totalElements: items.length,
    items: items.map((t) => ({
      ...t,
      spaceId: SPACE_ID,
      createdAt: "2026-06-01T00:00:00Z",
    })),
  };
}

function renderEditor() {
  const { Wrapper } = createQueryWrapper();
  return render(<PageTagEditor pageId={PAGE_ID} spaceId={SPACE_ID} />, { wrapper: Wrapper });
}

describe("PageTagEditor", () => {
  beforeEach(() => {
    // strict 모드의 default 핸들러 — 각 테스트가 server.use 로 override.
    server.use(
      http.get(`*/api/v1/pages/${PAGE_ID}/tags`, () => HttpResponse.json(pageTagListBody([]))),
      http.get(`*/api/v1/spaces/${SPACE_ID}/tags`, () => HttpResponse.json(spaceTagListBody([]))),
    );
  });

  it("부착된 태그 chip 이 렌더되고 × 클릭 시 detach 호출 + 무효화 후 사라진다", async () => {
    // counter 가 아니라 *DELETE 가 일어났는가* 의 의미로 분기 — invalidate 후 GET 이 두 번 이상 와도 안전.
    let detached = false;
    const detachCalls = vi.fn();
    server.use(
      http.get(`*/api/v1/pages/${PAGE_ID}/tags`, () =>
        HttpResponse.json(
          detached ? pageTagListBody([]) : pageTagListBody([{ tagId: "t_1", name: "frontend" }]),
        ),
      ),
      http.delete(`*/api/v1/pages/${PAGE_ID}/tags/t_1`, () => {
        detached = true;
        detachCalls();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const user = userEvent.setup();
    renderEditor();

    const removeButton = await screen.findByRole("button", { name: /frontend.*제거/ });
    await user.click(removeButton);

    await waitFor(() => expect(detachCalls).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /frontend.*제거/ })).not.toBeInTheDocument(),
    );
  });

  it("popover 에서 기존 태그를 선택하면 attach 호출 후 popover 가 닫힌다", async () => {
    const attachBody = vi.fn<(body: unknown) => void>();
    let attached = false;
    server.use(
      http.get(`*/api/v1/pages/${PAGE_ID}/tags`, () =>
        HttpResponse.json(
          attached ? pageTagListBody([{ tagId: "t_2", name: "wiki" }]) : pageTagListBody([]),
        ),
      ),
      http.get(`*/api/v1/spaces/${SPACE_ID}/tags`, () =>
        HttpResponse.json(
          spaceTagListBody([
            { tagId: "t_2", name: "wiki" },
            { tagId: "t_3", name: "react" },
          ]),
        ),
      ),
      http.post(`*/api/v1/pages/${PAGE_ID}/tags`, async ({ request }) => {
        attachBody(await request.json());
        attached = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const user = userEvent.setup();
    renderEditor();

    await user.click(await screen.findByRole("button", { name: "태그 추가" }));
    const option = await screen.findByRole("button", { name: "#wiki" });
    await user.click(option);

    await waitFor(() => expect(attachBody).toHaveBeenCalledWith({ tagId: "t_2" }));
  });

  it("일치하는 태그가 없으면 '새로 만들기' 가 등장하고 register → attach 가 연쇄된다", async () => {
    const registerBody = vi.fn<(body: unknown) => void>();
    const attachBody = vi.fn<(body: unknown) => void>();
    server.use(
      http.get(`*/api/v1/pages/${PAGE_ID}/tags`, () => HttpResponse.json(pageTagListBody([]))),
      http.get(`*/api/v1/spaces/${SPACE_ID}/tags`, () =>
        HttpResponse.json(spaceTagListBody([{ tagId: "t_1", name: "frontend" }])),
      ),
      http.post("*/api/v1/tags", async ({ request }) => {
        registerBody(await request.json());
        return HttpResponse.json({ tagId: "t_new" }, { status: 201 });
      }),
      http.post(`*/api/v1/pages/${PAGE_ID}/tags`, async ({ request }) => {
        attachBody(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const user = userEvent.setup();
    renderEditor();

    await user.click(await screen.findByRole("button", { name: "태그 추가" }));
    const input = await screen.findByPlaceholderText("태그 검색 또는 새 태그 이름");
    await user.type(input, "지식");

    const createButton = await screen.findByRole("button", { name: /지식.*새로 만들기/ });
    await user.click(createButton);

    await waitFor(() =>
      expect(registerBody).toHaveBeenCalledWith({ spaceId: SPACE_ID, name: "지식" }),
    );
    await waitFor(() => expect(attachBody).toHaveBeenCalledWith({ tagId: "t_new" }));
  });

  it("detach 가 실패하면 alert 가 노출된다 (chip 만 다시 활성화되고 silent 되는 회귀 차단)", async () => {
    server.use(
      http.get(`*/api/v1/pages/${PAGE_ID}/tags`, () =>
        HttpResponse.json(pageTagListBody([{ tagId: "t_1", name: "frontend" }])),
      ),
      http.delete(`*/api/v1/pages/${PAGE_ID}/tags/t_1`, () =>
        HttpResponse.json(
          { code: "INTERNAL_ERROR", message: "태그를 제거하지 못했습니다." },
          { status: 500 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderEditor();

    await user.click(await screen.findByRole("button", { name: /frontend.*제거/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("태그를 제거하지 못했습니다.");
  });

  it("이미 부착된 태그는 popover 의 자동완성 결과에서 제외된다", async () => {
    server.use(
      http.get(`*/api/v1/pages/${PAGE_ID}/tags`, () =>
        HttpResponse.json(pageTagListBody([{ tagId: "t_1", name: "frontend" }])),
      ),
      http.get(`*/api/v1/spaces/${SPACE_ID}/tags`, () =>
        HttpResponse.json(
          spaceTagListBody([
            { tagId: "t_1", name: "frontend" },
            { tagId: "t_2", name: "wiki" },
          ]),
        ),
      ),
    );

    const user = userEvent.setup();
    renderEditor();

    await user.click(await screen.findByRole("button", { name: "태그 추가" }));
    expect(await screen.findByRole("button", { name: "#wiki" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "#frontend" })).not.toBeInTheDocument();
  });
});
