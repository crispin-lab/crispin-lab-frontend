import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { asSpaceId } from "@/lib/api/ids";
import { server } from "@/mocks/server";
import { spaceBody } from "@/test/fixtures/space";
import { redirectModuleMock } from "@/test/mocks/redirect";
import { createQueryWrapper } from "@/test/queryWrapper";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: toastError },
}));

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

const { redirectToLoginMock } = vi.hoisted(() => ({ redirectToLoginMock: vi.fn() }));
vi.mock("@/lib/auth/redirect", () => redirectModuleMock(redirectToLoginMock));

vi.mock("@/components/editor/Editor", () => ({
  Editor: ({
    initialContent,
    onChange,
  }: {
    initialContent?: string;
    onChange?: (next: string) => void;
  }) => (
    <textarea
      aria-label="본문 (mock)"
      data-initial={initialContent ?? ""}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

import { NewPageView } from "./NewPageView";

beforeEach(() => {
  toastError.mockReset();
  routerPush.mockReset();
  redirectToLoginMock.mockReset();
  localStorage.clear();
  // 모든 테스트의 디폴트 — PUBLIC space (cascade 미적용, 기존 회귀 보호). cascade 케이스는 각자 override.
  server.use(
    http.get("*/api/v1/spaces/:spaceId", () => HttpResponse.json(spaceBody())),
    // ParentPagePicker 의 검색 default — 빈 결과. parent 선택이 필요한 케이스는 override.
    http.get("*/api/v1/pages", () =>
      HttpResponse.json({
        size: 20,
        isEmpty: true,
        totalPages: 0,
        hasNext: false,
        page: 0,
        items: [],
        totalElements: 0,
      }),
    ),
  );
});

describe("NewPageView", () => {
  it("제목이 비어 있으면 만들기 버튼이 비활성화된다", () => {
    const { Wrapper } = createQueryWrapper();
    render(<NewPageView spaceId={asSpaceId("s_1")} />, { wrapper: Wrapper });

    expect(screen.getByRole("button", { name: "만들기" })).toBeDisabled();
  });

  it("POST 가 spaceId / visibility / title / content 를 보낸 뒤 새 페이지로 navigate 한다", async () => {
    const captured: { value: Record<string, unknown> | null } = { value: null };
    server.use(
      http.post("*/api/v1/pages", async ({ request }) => {
        captured.value = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ pageId: "p_new" }, { status: 201 });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<NewPageView spaceId={asSpaceId("s_1")} />, { wrapper: Wrapper });

    await user.type(screen.getByPlaceholderText("제목을 입력해 주세요"), "새 글");
    await user.click(screen.getByLabelText("공개 범위"));
    await user.click(await screen.findByRole("option", { name: "공개" }));
    await user.click(screen.getByRole("button", { name: "만들기" }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/pages/p_new"));
    expect(captured.value).toMatchObject({
      spaceId: "s_1",
      visibility: "PUBLIC",
      title: "새 글",
    });
    expect(typeof captured.value?.content).toBe("string");
  });

  it("생성 실패 시 toast 가 백엔드 message 로 노출된다", async () => {
    server.use(
      http.post("*/api/v1/pages", () =>
        HttpResponse.json(
          { code: "SPACE_NOT_FOUND", message: "스페이스를 찾을 수 없습니다." },
          { status: 404 },
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<NewPageView spaceId={asSpaceId("s_1")} />, { wrapper: Wrapper });

    await user.type(screen.getByPlaceholderText("제목을 입력해 주세요"), "새 글");
    await user.click(screen.getByRole("button", { name: "만들기" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("스페이스를 찾을 수 없습니다."));
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("MEMBER 옵션을 선택해 POST 하면 visibility=MEMBER 가 전송된다", async () => {
    const captured: { value: Record<string, unknown> | null } = { value: null };
    server.use(
      http.post("*/api/v1/pages", async ({ request }) => {
        captured.value = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ pageId: "p_new" }, { status: 201 });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<NewPageView spaceId={asSpaceId("s_1")} />, { wrapper: Wrapper });

    await user.type(screen.getByPlaceholderText("제목을 입력해 주세요"), "멤버 글");
    await user.click(screen.getByLabelText("공개 범위"));
    await user.click(await screen.findByRole("option", { name: "멤버 공개" }));
    await user.click(screen.getByRole("button", { name: "만들기" }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/pages/p_new"));
    expect(captured.value).toMatchObject({
      spaceId: "s_1",
      visibility: "MEMBER",
      title: "멤버 글",
    });
  });

  it("INTERNAL space 면 MEMBER / PUBLIC 옵션이 disabled 다", async () => {
    server.use(
      http.get("*/api/v1/spaces/:spaceId", () =>
        HttpResponse.json(spaceBody({ visibility: "INTERNAL" })),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<NewPageView spaceId={asSpaceId("s_1")} />, { wrapper: Wrapper });

    await user.click(screen.getByLabelText("공개 범위"));

    expect(await screen.findByRole("option", { name: /^멤버 공개/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("option", { name: /^공개/ })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("option", { name: /^초안$/ })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("option", { name: /^비공개/ })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("INVALID_SESSION (401) 은 글로벌 가드가 처리하므로 toast 도 navigate 도 하지 않는다", async () => {
    server.use(
      http.post("*/api/v1/pages", () =>
        HttpResponse.json(
          { code: "INVALID_SESSION", message: "세션이 만료되었습니다." },
          { status: 401 },
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<NewPageView spaceId={asSpaceId("s_1")} />, { wrapper: Wrapper });

    await user.type(screen.getByPlaceholderText("제목을 입력해 주세요"), "새 글");
    await user.click(screen.getByRole("button", { name: "만들기" }));

    await waitFor(() => expect(redirectToLoginMock).toHaveBeenCalledTimes(1));
    expect(routerPush).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });
});

describe("NewPageView — hero / breadcrumb", () => {
  it("접근성용 sr-only h1 이 페이지 landmark 로 존재한다", () => {
    // TitleInput 자체가 text-3xl hero 역할이라 시각 h1 은 의도적으로 없다.
    // 스크린 리더 / landmark navigation 을 위해 sr-only h1 한 줄은 유지.
    const { Wrapper } = createQueryWrapper();
    render(<NewPageView spaceId={asSpaceId("s_1")} />, { wrapper: Wrapper });

    const heading = screen.getByRole("heading", { level: 1, name: "새 페이지 작성" });
    expect(heading.className).toMatch(/sr-only/);
  });

  it("breadcrumb 에 스페이스 이름 + '새 페이지' 두 segment 가 노출된다", async () => {
    const { Wrapper } = createQueryWrapper();
    render(<NewPageView spaceId={asSpaceId("s_1")} />, { wrapper: Wrapper });

    // space 데이터 도착 전엔 "이름 없는 스페이스" fallback — 도착 후 실제 이름으로 교체된다.
    const nav = await screen.findByRole("navigation", { name: "현재 페이지 경로" });
    await waitFor(() => expect(nav).toHaveTextContent("테스트 스페이스"));
    expect(nav).toHaveTextContent("새 페이지");
  });

  it("제목 입력 즉시 breadcrumb 의 마지막 segment 가 갱신된다", async () => {
    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<NewPageView spaceId={asSpaceId("s_1")} />, { wrapper: Wrapper });

    await user.type(screen.getByPlaceholderText("제목을 입력해 주세요"), "회의록");
    const nav = await screen.findByRole("navigation", { name: "현재 페이지 경로" });
    expect(nav).toHaveTextContent("회의록");
  });
});

describe("NewPageView — parent picker / payload", () => {
  it("parent 를 선택하면 POST payload 에 parentPageId 가 포함된다", async () => {
    const captured: { value: Record<string, unknown> | null } = { value: null };
    server.use(
      http.get("*/api/v1/pages", () =>
        HttpResponse.json({
          size: 20,
          isEmpty: false,
          totalPages: 1,
          hasNext: false,
          page: 0,
          items: [
            {
              spaceId: "s_1",
              visibility: "PUBLIC",
              parentPageId: null,
              displayOrder: 0,
              authorHandle: "crispin",
              title: "회의록",
              authorId: "u_1",
              pageId: "p_parent",
              updatedAt: "2026-06-01T00:00:00Z",
            },
          ],
          totalElements: 1,
        }),
      ),
      http.post("*/api/v1/pages", async ({ request }) => {
        captured.value = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ pageId: "p_new" }, { status: 201 });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<NewPageView spaceId={asSpaceId("s_1")} />, { wrapper: Wrapper });

    await user.type(screen.getByPlaceholderText("제목을 입력해 주세요"), "자식 글");
    await user.click(screen.getByRole("button", { name: "부모 페이지 선택" }));
    await user.click(await screen.findByRole("option", { name: "회의록" }));
    await user.click(screen.getByRole("button", { name: "만들기" }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/pages/p_new"));
    expect(captured.value).toMatchObject({ parentPageId: "p_parent", title: "자식 글" });
  });

  it("parent 미선택 시 POST payload 의 parentPageId 는 null 이다", async () => {
    const captured: { value: Record<string, unknown> | null } = { value: null };
    server.use(
      http.post("*/api/v1/pages", async ({ request }) => {
        captured.value = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ pageId: "p_new" }, { status: 201 });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<NewPageView spaceId={asSpaceId("s_1")} />, { wrapper: Wrapper });

    await user.type(screen.getByPlaceholderText("제목을 입력해 주세요"), "루트 글");
    await user.click(screen.getByRole("button", { name: "만들기" }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/pages/p_new"));
    expect(captured.value).toMatchObject({ parentPageId: null });
  });
});

describe("NewPageView — 취소 / 단축키", () => {
  it("취소 버튼을 누르면 스페이스 화면으로 navigate 한다", async () => {
    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<NewPageView spaceId={asSpaceId("s_1")} />, { wrapper: Wrapper });

    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(routerPush).toHaveBeenCalledWith("/spaces/s_1");
  });

  it("Cmd+S 가 submit 을 트리거한다", async () => {
    server.use(
      http.post("*/api/v1/pages", () => HttpResponse.json({ pageId: "p_new" }, { status: 201 })),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<NewPageView spaceId={asSpaceId("s_1")} />, { wrapper: Wrapper });

    await user.type(screen.getByPlaceholderText("제목을 입력해 주세요"), "단축키 글");
    await user.keyboard("{Meta>}s{/Meta}");

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/pages/p_new"));
  });

  it("IME composition 중 Cmd+S 는 submit 을 트리거하지 않는다", async () => {
    const postSpy = vi.fn(() => HttpResponse.json({ pageId: "p_new" }, { status: 201 }));
    server.use(http.post("*/api/v1/pages", postSpy));

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<NewPageView spaceId={asSpaceId("s_1")} />, { wrapper: Wrapper });

    const titleInput = screen.getByPlaceholderText("제목을 입력해 주세요");
    await user.type(titleInput, "IME 글");
    // dispatchEvent 로 isComposing: true 를 직접 박는다 — user.keyboard 는 이 플래그를 노출하지 않는다.
    // input 에 직접 dispatch 해야 containerRef.contains(target) 검사를 통과해 *isComposing 가드 자체* 가 검증된다.
    titleInput.focus();
    const event = new KeyboardEvent("keydown", {
      key: "s",
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, "isComposing", { value: true });
    titleInput.dispatchEvent(event);

    // handler 가 즉시 return 한다 — pending microtask 한 번만 flush 해도 mutation 미발화가 확정.
    await Promise.resolve();
    expect(postSpy).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
  });
});

describe("NewPageView — localStorage draft", () => {
  it("입력 후 디바운스 시간이 지나면 draft 가 저장된다", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<NewPageView spaceId={asSpaceId("s_1")} />, { wrapper: Wrapper });

    await user.type(screen.getByPlaceholderText("제목을 입력해 주세요"), "초안 제목");
    vi.advanceTimersByTime(600);

    const stored = localStorage.getItem("page-draft:s_1");
    expect(stored).not.toBeNull();
    expect(stored).toContain("초안 제목");

    vi.useRealTimers();
  });

  it("저장된 draft 가 있으면 banner 가 노출되고 폼은 빈 상태로 진입한다", async () => {
    localStorage.setItem(
      "page-draft:s_1",
      JSON.stringify({
        title: "복원된 글",
        content: '{"type":"doc","content":[]}',
        visibility: "PUBLIC",
        parent: { pageId: "p_parent", title: "복원 부모" },
        savedAt: Date.now(),
      }),
    );

    const { Wrapper } = createQueryWrapper();
    render(<NewPageView spaceId={asSpaceId("s_1")} />, { wrapper: Wrapper });

    expect(await screen.findByText(/이전에 작성하던 글이 있어요/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("제목을 입력해 주세요")).toHaveValue("");
  });

  it("banner 의 '이어서 작성' 을 누르면 draft 가 폼에 복원된다", async () => {
    localStorage.setItem(
      "page-draft:s_1",
      JSON.stringify({
        title: "복원된 글",
        content: '{"type":"doc","content":[]}',
        visibility: "PUBLIC",
        parent: { pageId: "p_parent", title: "복원 부모" },
        savedAt: Date.now(),
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<NewPageView spaceId={asSpaceId("s_1")} />, { wrapper: Wrapper });

    await user.click(await screen.findByRole("button", { name: "이어서 작성" }));

    expect(await screen.findByDisplayValue("복원된 글")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "부모 페이지 선택" })).toHaveTextContent("복원 부모");
    expect(screen.queryByText(/이전에 작성하던 글이 있어요/)).not.toBeInTheDocument();
  });

  it("banner 의 '버리기' 를 누르면 localStorage 가 정리되고 폼은 빈 상태를 유지한다", async () => {
    localStorage.setItem(
      "page-draft:s_1",
      JSON.stringify({
        title: "버려질 글",
        content: '{"type":"doc","content":[]}',
        visibility: "DRAFT",
        parent: null,
        savedAt: Date.now(),
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<NewPageView spaceId={asSpaceId("s_1")} />, { wrapper: Wrapper });

    await user.click(await screen.findByRole("button", { name: "버리기" }));

    expect(localStorage.getItem("page-draft:s_1")).toBeNull();
    expect(screen.getByPlaceholderText("제목을 입력해 주세요")).toHaveValue("");
    expect(screen.queryByText(/이전에 작성하던 글이 있어요/)).not.toBeInTheDocument();
  });

  it("draft 가 없으면 banner 도 노출되지 않는다", () => {
    // RTL render 는 effect 까지 flush 후 반환 — 추가 await 없이 결과 확인이 정합.
    const { Wrapper } = createQueryWrapper();
    render(<NewPageView spaceId={asSpaceId("s_1")} />, { wrapper: Wrapper });

    expect(screen.queryByText(/이전에 작성하던 글이 있어요/)).not.toBeInTheDocument();
  });

  it("제출 성공 시 draft 가 정리된다", async () => {
    server.use(
      http.post("*/api/v1/pages", () => HttpResponse.json({ pageId: "p_new" }, { status: 201 })),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<NewPageView spaceId={asSpaceId("s_1")} />, { wrapper: Wrapper });

    await user.type(screen.getByPlaceholderText("제목을 입력해 주세요"), "제출할 글");
    await user.click(screen.getByRole("button", { name: "만들기" }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/pages/p_new"));
    expect(localStorage.getItem("page-draft:s_1")).toBeNull();
  });
});
