import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { asSpaceId } from "@/lib/api/ids";
import { server } from "@/mocks/server";
import { spaceBody } from "@/test/fixtures/space";
import { createQueryWrapper } from "@/test/queryWrapper";

type ToastSuccessOptions = {
  id?: string;
  action?: { label: string; onClick: () => void };
};
const { toastError, toastSuccess } = vi.hoisted(() => ({
  toastError: vi.fn<(message: string) => void>(),
  toastSuccess: vi.fn<(message: string, options?: ToastSuccessOptions) => void>(),
}));
vi.mock("sonner", () => ({
  toast: { error: toastError, success: toastSuccess },
}));

const { notFoundMock, routerPush } = vi.hoisted(() => ({
  notFoundMock: vi.fn(),
  routerPush: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  useRouter: () => ({ push: routerPush }),
}));

import { SpaceEditView } from "./SpaceEditView";

const INITIAL = spaceBody({
  spaceId: "s_1",
  name: "원래 이름",
  description: "원래 설명",
  visibility: "PUBLIC",
  canEdit: true,
});

beforeEach(() => {
  toastError.mockReset();
  toastSuccess.mockReset();
  notFoundMock.mockClear();
  routerPush.mockReset();
  // 초기 진입에서 detail 재조회 (refetchOnMount: "always") 가 뜨므로 handler 등록.
  server.use(http.get("*/api/v1/spaces/s_1", () => HttpResponse.json(INITIAL)));
});

describe("SpaceEditView", () => {
  it("initialSpace 로 폼이 초기화된다 (이름 / 설명 / 공개 범위)", async () => {
    const { Wrapper } = createQueryWrapper();
    render(<SpaceEditView spaceId={asSpaceId("s_1")} initialSpace={INITIAL} />, {
      wrapper: Wrapper,
    });

    expect(await screen.findByDisplayValue("원래 이름")).toBeInTheDocument();
    expect(screen.getByDisplayValue("원래 설명")).toBeInTheDocument();
    // Select 트리거는 raw enum (PUBLIC) 을 노출 — 하단 안내 문구가 한국어 라벨 근거.
    expect(screen.getByRole("combobox", { name: "공개 범위" })).toBeInTheDocument();
    expect(screen.getByText("누구나 볼 수 있는 공개 스페이스")).toBeInTheDocument();
  });

  it("세 필드 모두 미변경이면 저장 버튼이 비활성", async () => {
    const { Wrapper } = createQueryWrapper();
    render(<SpaceEditView spaceId={asSpaceId("s_1")} initialSpace={INITIAL} />, {
      wrapper: Wrapper,
    });

    await screen.findByDisplayValue("원래 이름");
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it("이름을 비우면 저장 버튼이 비활성 (blank 방어)", async () => {
    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<SpaceEditView spaceId={asSpaceId("s_1")} initialSpace={INITIAL} />, {
      wrapper: Wrapper,
    });

    const nameInput = await screen.findByDisplayValue("원래 이름");
    await user.clear(nameInput);

    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it("이름만 수정하면 PUT body 에 name 만 담긴다 (dirty diff)", async () => {
    let putBody: Record<string, unknown> | null = null;
    server.use(
      http.put("*/api/v1/spaces/s_1", async ({ request }) => {
        putBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          spaceId: "s_1",
          name: "새 이름",
          description: "원래 설명",
          visibility: "PUBLIC",
          updatedAt: "2026-07-01T00:00:00Z",
        });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<SpaceEditView spaceId={asSpaceId("s_1")} initialSpace={INITIAL} />, {
      wrapper: Wrapper,
    });

    const nameInput = await screen.findByDisplayValue("원래 이름");
    await user.clear(nameInput);
    await user.type(nameInput, "새 이름");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(putBody).toEqual({ name: "새 이름" });
  });

  it("저장 성공 시 '스페이스로 이동' 액션 toast + 자동 navigate 하지 않는다", async () => {
    server.use(
      http.put("*/api/v1/spaces/s_1", () =>
        HttpResponse.json({
          spaceId: "s_1",
          name: "새 이름",
          description: "원래 설명",
          visibility: "PUBLIC",
          updatedAt: "2026-07-01T00:00:00Z",
        }),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<SpaceEditView spaceId={asSpaceId("s_1")} initialSpace={INITIAL} />, {
      wrapper: Wrapper,
    });

    const nameInput = await screen.findByDisplayValue("원래 이름");
    await user.clear(nameInput);
    await user.type(nameInput, "새 이름");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith(
        "저장했어요",
        expect.objectContaining({
          action: expect.objectContaining({ label: "스페이스로 이동" }),
        }),
      ),
    );

    expect(routerPush).not.toHaveBeenCalled();

    const options = toastSuccess.mock.calls[0][1];
    options?.action?.onClick();
    expect(routerPush).toHaveBeenCalledWith("/spaces/s_1");
  });

  it("저장 후 baseline 갱신 — 저장 버튼이 다시 disabled 로 돌아간다", async () => {
    server.use(
      http.put("*/api/v1/spaces/s_1", () =>
        HttpResponse.json({
          spaceId: "s_1",
          name: "새 이름",
          description: "원래 설명",
          visibility: "PUBLIC",
          updatedAt: "2026-07-01T00:00:00Z",
        }),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<SpaceEditView spaceId={asSpaceId("s_1")} initialSpace={INITIAL} />, {
      wrapper: Wrapper,
    });

    const nameInput = await screen.findByDisplayValue("원래 이름");
    await user.clear(nameInput);
    await user.type(nameInput, "새 이름");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("button", { name: "저장" })).toBeDisabled());
  });

  it("저장 실패 시 백엔드 message 가 alert 로 노출된다", async () => {
    server.use(
      http.put("*/api/v1/spaces/s_1", () =>
        HttpResponse.json(
          { code: "SPACE_NAME_DUPLICATED", message: "이미 같은 이름의 스페이스가 있습니다." },
          { status: 409 },
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<SpaceEditView spaceId={asSpaceId("s_1")} initialSpace={INITIAL} />, {
      wrapper: Wrapper,
    });

    const nameInput = await screen.findByDisplayValue("원래 이름");
    await user.clear(nameInput);
    await user.type(nameInput, "중복 이름");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("이미 같은 이름의 스페이스가 있습니다."),
    );
  });

  it("편집 완료 링크가 스페이스 상세로 향한다", async () => {
    const { Wrapper } = createQueryWrapper();
    render(<SpaceEditView spaceId={asSpaceId("s_1")} initialSpace={INITIAL} />, {
      wrapper: Wrapper,
    });

    await screen.findByDisplayValue("원래 이름");
    const done = await screen.findByRole("button", { name: "편집 완료" });
    expect(done).toHaveAttribute("href", "/spaces/s_1");
  });
});
