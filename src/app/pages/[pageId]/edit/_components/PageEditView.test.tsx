import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { asPageId } from "@/lib/api/ids";
import type { Page } from "@/lib/api/types";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/queryWrapper";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: toastError },
}));

// Editor 는 TipTap 기반이라 jsdom 에서 무겁다. 화면 회귀의 본질 (저장 흐름) 만 검증하면 되므로 가벼운 텍스트 영역으로 대체.
vi.mock("@/components/editor/Editor", () => ({
  Editor: ({
    initialContent,
    onChange,
  }: {
    initialContent?: string | null;
    onChange?: (next: string) => void;
  }) => (
    <textarea
      aria-label="본문 (mock)"
      defaultValue={initialContent ?? ""}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

import { PageEditView } from "./PageEditView";

function pageBody(overrides: Partial<Page> = {}): Page {
  return {
    createdAt: "2026-01-01T00:00:00Z",
    spaceId: "s_1",
    visibility: "PUBLIC",
    parentPageId: null,
    title: "원본 제목",
    authorId: "u_1",
    pageId: "p_1",
    currentVersion: 3,
    content: "본문 raw",
    updatedAt: "2026-05-26T05:32:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  toastError.mockReset();
});

describe("PageEditView", () => {
  it("페이지 조회 성공 시 제목과 visibility 가 노출된다", async () => {
    server.use(http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody())));

    const { Wrapper } = createQueryWrapper();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    expect(await screen.findByDisplayValue("원본 제목")).toBeInTheDocument();
    expect(screen.getByLabelText(/공개 범위/)).toBeInTheDocument();
    expect(screen.getByText(/v3/)).toBeInTheDocument();
  });

  it("저장 버튼은 제목이 비어 있으면 비활성화된다", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody({ title: "원본" }))),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    const titleInput = await screen.findByDisplayValue("원본");
    const saveButton = screen.getByRole("button", { name: "저장" });
    expect(saveButton).toBeEnabled();

    await user.clear(titleInput);
    expect(saveButton).toBeDisabled();
  });

  it("저장 시 PUT 으로 새 title/content 가 전송된다", async () => {
    const captured: { value: { title: string; content: string } | null } = { value: null };
    server.use(
      http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody({ title: "원본" }))),
      http.put("*/api/v1/pages/p_1", async ({ request }) => {
        const body = (await request.json()) as { title: string; content: string };
        captured.value = body;
        return HttpResponse.json({
          title: body.title,
          pageId: "p_1",
          version: 4,
          updatedAt: "2026-05-27T00:00:00Z",
        });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    const titleInput = await screen.findByDisplayValue("원본");
    await user.clear(titleInput);
    await user.type(titleInput, "수정");

    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(captured.value).not.toBeNull());
    expect(captured.value?.title).toBe("수정");
    expect(toastError).not.toHaveBeenCalled();
  });

  it("저장 실패 시 toast 가 백엔드 message 로 노출된다", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody())),
      http.put("*/api/v1/pages/p_1", () =>
        HttpResponse.json(
          { code: "PAGE_LOCKED", message: "다른 사용자가 편집 중입니다." },
          { status: 409 },
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    await screen.findByDisplayValue("원본 제목");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("다른 사용자가 편집 중입니다."));
  });

  it("INVALID_SESSION (401) 은 글로벌 가드가 처리하므로 toast 는 띄우지 않는다", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody())),
      http.put("*/api/v1/pages/p_1", () =>
        HttpResponse.json(
          { code: "INVALID_SESSION", message: "세션이 만료되었습니다." },
          { status: 401 },
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    await screen.findByDisplayValue("원본 제목");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(toastError).not.toHaveBeenCalled();
  });

  it("페이지 조회 실패 시 에러 메시지를 노출한다", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1", () =>
        HttpResponse.json(
          { code: "PAGE_NOT_FOUND", message: "페이지를 찾을 수 없습니다." },
          { status: 404 },
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    expect(await screen.findByRole("alert")).toHaveTextContent("페이지를 찾을 수 없습니다.");
  });
});
