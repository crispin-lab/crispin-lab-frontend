import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { asSpaceId } from "@/lib/api/ids";
import { server } from "@/mocks/server";
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
  Editor: ({ onChange }: { onChange?: (next: string) => void }) => (
    <textarea aria-label="본문 (mock)" onChange={(event) => onChange?.(event.target.value)} />
  ),
}));

import { NewPageView } from "./NewPageView";

beforeEach(() => {
  toastError.mockReset();
  routerPush.mockReset();
  redirectToLoginMock.mockReset();
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

    await waitFor(() => expect(routerPush).not.toHaveBeenCalled());
    expect(toastError).not.toHaveBeenCalled();
  });
});
