import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { NewSpaceView } from "./NewSpaceView";

beforeEach(() => {
  toastError.mockReset();
  routerPush.mockReset();
  redirectToLoginMock.mockReset();
});

describe("NewSpaceView", () => {
  it("이름 또는 설명이 비어 있으면 만들기 버튼이 비활성화된다", async () => {
    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<NewSpaceView />, { wrapper: Wrapper });

    expect(screen.getByRole("button", { name: "만들기" })).toBeDisabled();

    await user.type(screen.getByLabelText("이름"), "이름만");
    expect(screen.getByRole("button", { name: "만들기" })).toBeDisabled();

    await user.type(screen.getByLabelText("설명"), "설명 추가");
    expect(screen.getByRole("button", { name: "만들기" })).toBeEnabled();
  });

  it("POST 가 name / description / visibility 를 보낸 뒤 /pages/new?spaceId=... 로 navigate 한다", async () => {
    const captured: { value: Record<string, unknown> | null } = { value: null };
    server.use(
      http.post("*/api/v1/spaces", async ({ request }) => {
        captured.value = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ spaceId: "s_new" }, { status: 201 });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<NewSpaceView />, { wrapper: Wrapper });

    await user.type(screen.getByLabelText("이름"), "디자인 시스템");
    await user.type(screen.getByLabelText("설명"), "디자인 가이드");
    await user.click(screen.getByLabelText("공개 범위"));
    await user.click(await screen.findByRole("option", { name: "공개" }));
    await user.click(screen.getByRole("button", { name: "만들기" }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/pages/new?spaceId=s_new"));
    expect(captured.value).toEqual({
      name: "디자인 시스템",
      description: "디자인 가이드",
      visibility: "PUBLIC",
    });
  });

  it("기본 visibility 는 INTERNAL", async () => {
    const captured: { value: Record<string, unknown> | null } = { value: null };
    server.use(
      http.post("*/api/v1/spaces", async ({ request }) => {
        captured.value = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ spaceId: "s_x" }, { status: 201 });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<NewSpaceView />, { wrapper: Wrapper });

    await user.type(screen.getByLabelText("이름"), "내 공간");
    await user.type(screen.getByLabelText("설명"), "설명");
    await user.click(screen.getByRole("button", { name: "만들기" }));

    await waitFor(() => expect(routerPush).toHaveBeenCalled());
    expect(captured.value?.visibility).toBe("INTERNAL");
  });

  it("생성 실패 시 toast 가 백엔드 message 로 노출되고 navigate 하지 않는다", async () => {
    server.use(
      http.post("*/api/v1/spaces", () =>
        HttpResponse.json(
          { code: "SPACE_NAME_DUPLICATED", message: "이미 같은 이름의 스페이스가 있습니다." },
          { status: 409 },
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<NewSpaceView />, { wrapper: Wrapper });

    await user.type(screen.getByLabelText("이름"), "중복");
    await user.type(screen.getByLabelText("설명"), "설명");
    await user.click(screen.getByRole("button", { name: "만들기" }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("이미 같은 이름의 스페이스가 있습니다."),
    );
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("INVALID_SESSION (401) 은 글로벌 가드가 처리하므로 toast 도 navigate 도 하지 않는다", async () => {
    server.use(
      http.post("*/api/v1/spaces", () =>
        HttpResponse.json(
          { code: "INVALID_SESSION", message: "세션이 만료되었습니다." },
          { status: 401 },
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<NewSpaceView />, { wrapper: Wrapper });

    await user.type(screen.getByLabelText("이름"), "스페이스");
    await user.type(screen.getByLabelText("설명"), "설명");
    await user.click(screen.getByRole("button", { name: "만들기" }));

    await waitFor(() => expect(redirectToLoginMock).toHaveBeenCalledTimes(1));
    expect(routerPush).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });
});
