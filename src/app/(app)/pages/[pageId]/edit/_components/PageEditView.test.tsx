import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { asPageId } from "@/lib/api/ids";
import { server } from "@/mocks/server";
import { pageBody } from "@/test/fixtures/page";
import { spaceBody } from "@/test/fixtures/space";
import { redirectModuleMock } from "@/test/mocks/redirect";
import { createQueryWrapper } from "@/test/queryWrapper";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: toastError },
}));

const { redirectToLoginMock } = vi.hoisted(() => ({ redirectToLoginMock: vi.fn() }));
vi.mock("@/lib/auth/redirect", () => redirectModuleMock(redirectToLoginMock));

// 실제 notFound() 는 throw 하지만, 테스트는 호출 사실만 검증하고 fall-through 렌더는 무시한다 (jsdom 에 ErrorBoundary 가 없어 throw 시 unhandled).
const { notFoundMock, routerPush } = vi.hoisted(() => ({
  notFoundMock: vi.fn(),
  routerPush: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  useRouter: () => ({ push: routerPush }),
}));

// PageTagEditor 는 자체 테스트 (PageTagEditor.test.tsx) 가 커버 — 저장 / 권한 흐름 검증에서는 stub.
vi.mock("./PageTagEditor", () => ({
  PageTagEditor: () => null,
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

beforeEach(() => {
  toastError.mockReset();
  redirectToLoginMock.mockReset();
  notFoundMock.mockClear();
  routerPush.mockReset();
  localStorage.clear();
  // 모든 테스트의 디폴트 — PUBLIC space (cascade 미적용, 기존 회귀 보호). cascade 케이스는 각자 override.
  server.use(http.get("*/api/v1/spaces/:spaceId", () => HttpResponse.json(spaceBody())));
});

describe("PageEditView", () => {
  it("페이지 조회 성공 시 제목과 visibility (상단 chip + footer chip) 가 노출된다", async () => {
    server.use(http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody())));

    const { Wrapper } = createQueryWrapper();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    expect(await screen.findByDisplayValue("원본 제목")).toBeInTheDocument();
    expect(screen.getByLabelText(/공개 범위: /)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /공개 범위 변경/ })).toBeInTheDocument();
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

  it("저장 시 PUT 으로 새 title/content/visibility 가 전송된다", async () => {
    const captured: {
      value: { title: string; content: string; visibility: string } | null;
    } = { value: null };
    server.use(
      http.get("*/api/v1/pages/p_1", () =>
        HttpResponse.json(pageBody({ title: "원본", visibility: "PUBLIC" })),
      ),
      http.put("*/api/v1/pages/p_1", async ({ request }) => {
        const body = (await request.json()) as {
          title: string;
          content: string;
          visibility: string;
        };
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
    expect(captured.value?.visibility).toBe("PUBLIC");
    expect(toastError).not.toHaveBeenCalled();
  });

  it("공개 범위를 바꿔 저장하면 PUT body 의 visibility 가 새 값으로 전송된다", async () => {
    const captured: { value: { visibility: string } | null } = { value: null };
    server.use(
      http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody({ visibility: "PUBLIC" }))),
      http.put("*/api/v1/pages/p_1", async ({ request }) => {
        const body = (await request.json()) as { visibility: string };
        captured.value = body;
        return HttpResponse.json({
          title: "원본 제목",
          pageId: "p_1",
          version: 4,
          updatedAt: "2026-05-27T00:00:00Z",
        });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    await screen.findByDisplayValue("원본 제목");
    await user.click(screen.getByRole("button", { name: /공개 범위 변경/ }));
    await user.click(screen.getByLabelText("공개 범위"));
    await user.click(await screen.findByRole("option", { name: /비공개/ }));
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(captured.value).not.toBeNull());
    expect(captured.value?.visibility).toBe("INTERNAL");
    expect(toastError).not.toHaveBeenCalled();
  });

  it("공개 범위를 MEMBER 로 바꿔 저장하면 PUT body 의 visibility 가 MEMBER 가 된다", async () => {
    const captured: { value: { visibility: string } | null } = { value: null };
    server.use(
      http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody({ visibility: "PUBLIC" }))),
      http.put("*/api/v1/pages/p_1", async ({ request }) => {
        const body = (await request.json()) as { visibility: string };
        captured.value = body;
        return HttpResponse.json({
          title: "원본 제목",
          pageId: "p_1",
          version: 4,
          updatedAt: "2026-05-27T00:00:00Z",
        });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    await screen.findByDisplayValue("원본 제목");
    await user.click(screen.getByRole("button", { name: /공개 범위 변경/ }));
    await user.click(screen.getByLabelText("공개 범위"));
    await user.click(await screen.findByRole("option", { name: /멤버 공개/ }));
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(captured.value).not.toBeNull());
    expect(captured.value?.visibility).toBe("MEMBER");
    expect(toastError).not.toHaveBeenCalled();
  });

  it("PUBLIC space 면 모든 visibility 옵션이 enabled 다", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody({ visibility: "DRAFT" }))),
      http.get("*/api/v1/spaces/:spaceId", () =>
        HttpResponse.json(spaceBody({ visibility: "PUBLIC" })),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    await screen.findByDisplayValue("원본 제목");
    await user.click(screen.getByRole("button", { name: /공개 범위 변경/ }));
    await user.click(screen.getByLabelText("공개 범위"));

    for (const name of [/^초안$/, /^비공개$/, /^멤버 공개$/, /^공개$/]) {
      const option = await screen.findByRole("option", { name });
      expect(option).not.toHaveAttribute("aria-disabled", "true");
    }
  });

  it("INTERNAL space 면 PUBLIC 만 disabled + 사유가 SR 에 노출된다 (MEMBER 페이지는 허용)", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody({ visibility: "DRAFT" }))),
      http.get("*/api/v1/spaces/:spaceId", () =>
        HttpResponse.json(spaceBody({ visibility: "INTERNAL" })),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    await screen.findByDisplayValue("원본 제목");
    await user.click(screen.getByRole("button", { name: /공개 범위 변경/ }));
    await user.click(screen.getByLabelText("공개 범위"));

    expect(await screen.findByRole("option", { name: /^공개/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    for (const name of [/^초안$/, /^비공개$/, /^멤버 공개/]) {
      expect(screen.getByRole("option", { name })).not.toHaveAttribute("aria-disabled", "true");
    }
    expect(
      screen.getAllByText("이 스페이스는 비공개 입니다. 페이지를 더 넓게 공개할 수 없습니다."),
    ).toHaveLength(1);
  });

  it("저장 시 권한 거부 (403) 는 글로벌 mutation 에러 toast 로 흡수된다", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody())),
      http.put("*/api/v1/pages/p_1", () =>
        HttpResponse.json(
          { code: "FORBIDDEN", message: "공개 범위를 변경할 권한이 없습니다." },
          { status: 403 },
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    await screen.findByDisplayValue("원본 제목");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("공개 범위를 변경할 권한이 없습니다."),
    );
    expect(notFoundMock).not.toHaveBeenCalled();
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

  it("404 면 notFound() — PRIVATE 페이지 존재 비노출", async () => {
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

    await waitFor(() => expect(notFoundMock).toHaveBeenCalled());
  });

  it("403 도 notFound() — reading 경로와 동일하게 흡수", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1", () =>
        HttpResponse.json({ code: "FORBIDDEN", message: "권한이 없습니다." }, { status: 403 }),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    await waitFor(() => expect(notFoundMock).toHaveBeenCalled());
  });

  it("기타 5xx 등은 inline alert 로 노출", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1", () =>
        HttpResponse.json({ code: "INTERNAL", message: "서버 오류입니다." }, { status: 500 }),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    expect(await screen.findByRole("alert")).toHaveTextContent("서버 오류입니다.");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("페이지 삭제 → 확인 시 DELETE 호출 + 소속 스페이스로 이동", async () => {
    let deleted = false;
    server.use(
      http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody({ spaceId: "s_42" }))),
      http.delete("*/api/v1/pages/p_1", () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    await screen.findByDisplayValue("원본 제목");
    await user.click(screen.getByRole("button", { name: "페이지 삭제" }));
    await user.click(await screen.findByRole("button", { name: "삭제" }));

    await waitFor(() => expect(deleted).toBe(true));
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/spaces/s_42"));
    expect(toastError).not.toHaveBeenCalled();
  });

  it("삭제 dialog 의 취소를 누르면 DELETE 가 호출되지 않는다", async () => {
    let hits = 0;
    server.use(
      http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody())),
      http.delete("*/api/v1/pages/p_1", () => {
        hits += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    await screen.findByDisplayValue("원본 제목");
    await user.click(screen.getByRole("button", { name: "페이지 삭제" }));
    await user.click(await screen.findByRole("button", { name: "취소" }));

    expect(hits).toBe(0);
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("삭제 실패 시 toast 가 백엔드 message 로 노출되고 redirect 는 일어나지 않는다", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody())),
      http.delete("*/api/v1/pages/p_1", () =>
        HttpResponse.json({ code: "FORBIDDEN", message: "삭제 권한이 없습니다." }, { status: 403 }),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    await screen.findByDisplayValue("원본 제목");
    await user.click(screen.getByRole("button", { name: "페이지 삭제" }));
    await user.click(await screen.findByRole("button", { name: "삭제" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("삭제 권한이 없습니다."));
    expect(routerPush).not.toHaveBeenCalled();
  });
});

describe("PageEditView — Cmd+S 단축키", () => {
  it("Cmd+S 가 저장을 트리거한다", async () => {
    const captured: { value: Record<string, unknown> | null } = { value: null };
    server.use(
      http.get("*/api/v1/pages/:pageId", () => HttpResponse.json(pageBody())),
      http.put("*/api/v1/pages/:pageId", async ({ request }) => {
        captured.value = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ pageId: "p_1", currentVersion: 4 });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    // 입력 도중 단축키를 누르는 실 사용자 시나리오 정합 — 제목 input 에 한 글자 입력 후 Cmd+S.
    const titleInput = await screen.findByDisplayValue("원본 제목");
    await user.type(titleInput, " (수정)");
    await user.keyboard("{Meta>}s{/Meta}");

    await waitFor(() => expect(captured.value).toMatchObject({ title: "원본 제목 (수정)" }));
  });

  it("IME composition 중 Cmd+S 는 저장을 트리거하지 않는다", async () => {
    const putSpy = vi.fn(() => HttpResponse.json({ pageId: "p_1", currentVersion: 4 }));
    server.use(
      http.get("*/api/v1/pages/:pageId", () => HttpResponse.json(pageBody())),
      http.put("*/api/v1/pages/:pageId", putSpy),
    );

    const { Wrapper } = createQueryWrapper();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    // titleInput 에 직접 dispatch 해야 containerRef.contains(target) 검사를 통과해 *isComposing 가드 자체* 가 검증된다.
    const titleInput = await screen.findByDisplayValue("원본 제목");
    titleInput.focus();

    const event = new KeyboardEvent("keydown", {
      key: "s",
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, "isComposing", { value: true });
    titleInput.dispatchEvent(event);

    await Promise.resolve();
    expect(putSpy).not.toHaveBeenCalled();
  });
});

describe("PageEditView — hero / breadcrumb", () => {
  it("접근성용 sr-only h1 이 '페이지 편집' landmark 로 존재한다", async () => {
    server.use(http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody())));

    const { Wrapper } = createQueryWrapper();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    const heading = await screen.findByRole("heading", { level: 1, name: "페이지 편집" });
    expect(heading.className).toMatch(/sr-only/);
  });

  it("ancestors 가 있으면 breadcrumb 에 조상 segment 와 현재 제목이 노출된다", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1", () =>
        HttpResponse.json(
          pageBody({
            ancestors: [{ pageId: "p_root", title: "회의" }],
          }),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    await screen.findByDisplayValue("원본 제목");
    const nav = await screen.findByRole("navigation", { name: "현재 페이지 경로" });
    expect(nav).toHaveTextContent("회의");
    expect(nav).toHaveTextContent("원본 제목");
  });

  it("제목 입력 즉시 breadcrumb 의 마지막 segment 가 갱신된다", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1", () =>
        HttpResponse.json(
          pageBody({
            ancestors: [{ pageId: "p_root", title: "회의" }],
          }),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    const titleInput = await screen.findByDisplayValue("원본 제목");
    await user.clear(titleInput);
    await user.type(titleInput, "수정된 제목");

    const nav = await screen.findByRole("navigation", { name: "현재 페이지 경로" });
    expect(nav).toHaveTextContent("수정된 제목");
  });
});

describe("PageEditView — visibility chip", () => {
  it("footer popover 에서 visibility 를 바꾸면 상단 chip 이 즉시 갱신된다", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody({ visibility: "DRAFT" }))),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    await screen.findByDisplayValue("원본 제목");
    expect(screen.getByLabelText("공개 범위: 초안")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /공개 범위 변경/ }));
    await user.click(screen.getByLabelText("공개 범위"));
    await user.click(await screen.findByRole("option", { name: /^공개$/ }));

    expect(await screen.findByLabelText("공개 범위: 공개")).toBeInTheDocument();
  });

  it("하단 카드에는 공개 범위 select 가 더 이상 노출되지 않는다 (footer 로 이동)", async () => {
    server.use(http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody())));

    const { Wrapper } = createQueryWrapper();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    await screen.findByDisplayValue("원본 제목");
    // 화면 전체에서 "공개 범위" 로 접근 가능한 select combobox 는 footer 팝오버 안 하나뿐.
    // label tag 부재만 검사하면 select 만 남기고 label 이 사라지는 우연 회귀를 놓친다.
    expect(screen.queryAllByRole("combobox", { name: "공개 범위" })).toHaveLength(0);
    expect(screen.getByText("버전 정보")).toBeInTheDocument();
  });
});

describe("PageEditView — localStorage draft", () => {
  it("미저장 draft 가 있고 version 이 같으면 banner 가 노출되되 충돌 경고는 표시되지 않는다", async () => {
    server.use(http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody())));
    localStorage.setItem(
      "page-edit-draft:p_1",
      JSON.stringify({
        title: "미저장 변경",
        content: '{"type":"doc","content":[]}',
        visibility: "PUBLIC",
        savedAtVersion: 3,
        savedAt: Date.now(),
      }),
    );

    const { Wrapper } = createQueryWrapper();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    await screen.findByDisplayValue("원본 제목");
    expect(await screen.findByText(/저장하지 않은 변경 사항이 있어요/)).toBeInTheDocument();
    expect(screen.queryByText(/다른 곳에서 페이지가 업데이트/)).not.toBeInTheDocument();
  });

  it("draft 의 savedAtVersion 이 BE 의 currentVersion 과 다르면 충돌 경고가 함께 표시된다", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody({ currentVersion: 5 }))),
    );
    localStorage.setItem(
      "page-edit-draft:p_1",
      JSON.stringify({
        title: "옛 변경",
        content: '{"type":"doc","content":[]}',
        visibility: "PUBLIC",
        savedAtVersion: 3,
        savedAt: Date.now(),
      }),
    );

    const { Wrapper } = createQueryWrapper();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    expect(await screen.findByText(/다른 곳에서 페이지가 업데이트/)).toBeInTheDocument();
  });

  it("'이어서 편집' 을 누르면 draft 가 폼에 복원된다", async () => {
    server.use(http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody())));
    localStorage.setItem(
      "page-edit-draft:p_1",
      JSON.stringify({
        title: "미저장 제목",
        content: '{"type":"doc","content":[]}',
        visibility: "PUBLIC",
        savedAtVersion: 3,
        savedAt: Date.now(),
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    await screen.findByDisplayValue("원본 제목");
    await user.click(await screen.findByRole("button", { name: "이어서 편집" }));

    expect(await screen.findByDisplayValue("미저장 제목")).toBeInTheDocument();
    expect(screen.queryByText(/저장하지 않은 변경 사항이 있어요/)).not.toBeInTheDocument();
  });

  it("'버리기' 를 누르면 localStorage 가 정리되고 원본이 유지된다", async () => {
    server.use(http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody())));
    localStorage.setItem(
      "page-edit-draft:p_1",
      JSON.stringify({
        title: "버릴 변경",
        content: '{"type":"doc","content":[]}',
        visibility: "PUBLIC",
        savedAtVersion: 3,
        savedAt: Date.now(),
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    await screen.findByDisplayValue("원본 제목");
    await user.click(await screen.findByRole("button", { name: "버리기" }));

    expect(localStorage.getItem("page-edit-draft:p_1")).toBeNull();
    expect(screen.getByDisplayValue("원본 제목")).toBeInTheDocument();
    expect(screen.queryByText(/저장하지 않은 변경 사항이 있어요/)).not.toBeInTheDocument();
  });

  it("stale draft 가 떠 있는 동안 사용자가 원본 편집해도 banner 유지 + localStorage 도 그대로", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody({ currentVersion: 5 }))),
    );
    const staleDraft = JSON.stringify({
      title: "옛 변경",
      content: '{"type":"doc","content":[]}',
      visibility: "PUBLIC",
      savedAtVersion: 3,
      savedAt: Date.now(),
    });
    localStorage.setItem("page-edit-draft:p_1", staleDraft);

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    // stale 안내 banner 가 떠 있는 상태에서 원본 제목을 살짝 수정.
    expect(await screen.findByText(/다른 곳에서 페이지가 업데이트/)).toBeInTheDocument();
    const titleInput = await screen.findByDisplayValue("원본 제목");
    await user.type(titleInput, " (살짝 수정)");

    // banner 는 그대로, autosave 보류라 localStorage 의 stale draft 도 그대로.
    expect(screen.getByText(/다른 곳에서 페이지가 업데이트/)).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem("page-edit-draft:p_1")).toBe(staleDraft));
  });

  it("저장 성공 시 draft 가 정리된다", async () => {
    server.use(
      http.get("*/api/v1/pages/p_1", () => HttpResponse.json(pageBody())),
      http.put("*/api/v1/pages/p_1", () => HttpResponse.json({ pageId: "p_1", currentVersion: 4 })),
    );
    localStorage.setItem(
      "page-edit-draft:p_1",
      JSON.stringify({
        title: "변경",
        content: '{"type":"doc","content":[]}',
        visibility: "PUBLIC",
        savedAtVersion: 3,
        savedAt: Date.now(),
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<PageEditView pageId={asPageId("p_1")} />, { wrapper: Wrapper });

    const titleInput = await screen.findByDisplayValue("원본 제목");
    await user.type(titleInput, " (수정)");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(localStorage.getItem("page-edit-draft:p_1")).toBeNull());
  });
});
