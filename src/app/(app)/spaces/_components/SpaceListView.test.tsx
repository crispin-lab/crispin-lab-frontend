import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/queryWrapper";

import { SpaceListView } from "./SpaceListView";

describe("SpaceListView", () => {
  it("결과가 있으면 카드 목록으로 렌더한다", async () => {
    server.use(
      http.get("*/api/v1/spaces", () =>
        HttpResponse.json({
          size: 20,
          isEmpty: false,
          totalPages: 1,
          hasNext: false,
          page: 0,
          totalElements: 1,
          items: [
            {
              createdAt: "2026-01-01T00:00:00Z",
              spaceId: "s_1",
              visibility: "PUBLIC",
              name: "공개 스페이스",
              description: "설명",
              updatedAt: "2026-06-01T00:00:00Z",
            },
          ],
        }),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceListView />, { wrapper: Wrapper });

    expect(await screen.findByText("공개 스페이스")).toBeInTheDocument();
    expect(screen.getByText("설명")).toBeInTheDocument();
    // visibility badge 가 정상 라벨로 매핑 (PUBLIC → "공개")
    expect(screen.getByLabelText(/공개 범위: 공개/)).toBeInTheDocument();
    // 카드 메타가 updatedAt 의 "수정 …" prefix 로 노출
    expect(screen.getByText(/^수정 /)).toBeInTheDocument();
  });

  it("결과가 비어 있으면 빈 상태 안내 + 첫 스페이스 CTA 를 보여준다", async () => {
    server.use(
      http.get("*/api/v1/spaces", () =>
        HttpResponse.json({
          size: 20,
          isEmpty: true,
          totalPages: 0,
          hasNext: false,
          page: 0,
          totalElements: 0,
          items: [],
        }),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<SpaceListView />, { wrapper: Wrapper });

    expect(await screen.findByText("아직 스페이스가 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "첫 스페이스 만들기" })).toHaveAttribute(
      "href",
      "/spaces/new",
    );
  });

  it("에러면 백엔드 메시지를 노출하고 다시 시도 버튼을 보여준다", async () => {
    let hits = 0;
    server.use(
      http.get("*/api/v1/spaces", () => {
        hits += 1;
        if (hits === 1) {
          return HttpResponse.json(
            { code: "INTERNAL_ERROR", message: "잠시 후 다시 시도해 주세요." },
            { status: 500 },
          );
        }
        return HttpResponse.json({
          size: 20,
          isEmpty: true,
          totalPages: 0,
          hasNext: false,
          page: 0,
          totalElements: 0,
          items: [],
        });
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<SpaceListView />, { wrapper: Wrapper });

    expect(await screen.findByText("잠시 후 다시 시도해 주세요.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    await waitFor(() => expect(screen.getByText("아직 스페이스가 없습니다.")).toBeInTheDocument());
  });
});
