import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/queryWrapper";

import { RecommendedPageList } from "./RecommendedPageList";

function buildPageSearchResponse(items: ReadonlyArray<Record<string, unknown>>) {
  return {
    size: 10,
    isEmpty: items.length === 0,
    totalPages: items.length === 0 ? 0 : 1,
    hasNext: false,
    page: 0,
    totalElements: items.length,
    items,
  };
}

describe("RecommendedPageList", () => {
  it("결과가 있으면 제목·수정 시각 row 로 렌더한다", async () => {
    server.use(
      http.get("*/api/v1/pages", () =>
        HttpResponse.json(
          buildPageSearchResponse([
            {
              spaceId: "s_1",
              displayOrder: 0,
              title: "TipTap 위키 링크 구현 메모",
              pageId: "p_1",
              updatedAt: "2026-05-22T00:00:00Z",
            },
            {
              spaceId: "s_1",
              displayOrder: 1,
              title: "1Q84 (3편) 독서 정리",
              pageId: "p_2",
              updatedAt: "2026-05-19T00:00:00Z",
            },
          ]),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<RecommendedPageList />, { wrapper: Wrapper });

    expect(await screen.findByText("TipTap 위키 링크 구현 메모")).toBeInTheDocument();
    expect(screen.getByText("1Q84 (3편) 독서 정리")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /TipTap 위키 링크 구현 메모/ })).toHaveAttribute(
      "href",
      "/pages/p_1",
    );
  });

  it("결과가 비어 있으면 빈 상태 안내를 보여준다", async () => {
    server.use(http.get("*/api/v1/pages", () => HttpResponse.json(buildPageSearchResponse([]))));

    const { Wrapper } = createQueryWrapper();
    render(<RecommendedPageList />, { wrapper: Wrapper });

    expect(await screen.findByText("아직 공개된 페이지가 없습니다.")).toBeInTheDocument();
  });

  it("에러면 백엔드 메시지와 다시 시도 버튼을 보여주고 retry 가 성공한다", async () => {
    let hits = 0;
    server.use(
      http.get("*/api/v1/pages", () => {
        hits += 1;
        if (hits === 1) {
          return HttpResponse.json(
            { code: "INTERNAL_ERROR", message: "잠시 후 다시 시도해 주세요." },
            { status: 500 },
          );
        }
        return HttpResponse.json(buildPageSearchResponse([]));
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<RecommendedPageList />, { wrapper: Wrapper });

    expect(await screen.findByText("잠시 후 다시 시도해 주세요.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    await waitFor(() =>
      expect(screen.getByText("아직 공개된 페이지가 없습니다.")).toBeInTheDocument(),
    );
    expect(screen.queryByText("잠시 후 다시 시도해 주세요.")).not.toBeInTheDocument();
  });
});
