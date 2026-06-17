import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/queryWrapper";

import { TagCloud } from "./TagCloud";

function buildResponse(items: Array<{ name: string; usageCount: number }>) {
  return {
    size: 20,
    isEmpty: items.length === 0,
    totalPages: items.length === 0 ? 0 : 1,
    hasNext: false,
    page: 0,
    totalElements: items.length,
    items,
  };
}

describe("TagCloud", () => {
  it("결과가 있으면 각 태그가 #이름 + 사용 횟수 row 로 렌더되고 /search?tag= 로 link 된다", async () => {
    server.use(
      http.get("*/api/v1/tags/popular", () =>
        HttpResponse.json(
          buildResponse([
            { name: "frontend", usageCount: 12 },
            { name: "위키", usageCount: 5 },
          ]),
        ),
      ),
    );

    const { Wrapper } = createQueryWrapper();
    render(<TagCloud />, { wrapper: Wrapper });

    const frontendLink = await screen.findByRole("link", { name: /#frontend/ });
    expect(frontendLink).toHaveAttribute("href", "/search?tag=frontend");

    const koreanLink = screen.getByRole("link", { name: /#위키/ });
    expect(koreanLink).toHaveAttribute("href", `/search?tag=${encodeURIComponent("위키")}`);
  });

  it("결과가 비어 있으면 안내 문구를 보여준다", async () => {
    server.use(http.get("*/api/v1/tags/popular", () => HttpResponse.json(buildResponse([]))));

    const { Wrapper } = createQueryWrapper();
    render(<TagCloud />, { wrapper: Wrapper });

    expect(await screen.findByText("아직 사용된 태그가 없습니다.")).toBeInTheDocument();
  });

  it("에러면 백엔드 메시지를 보여주고 다시 시도 성공 시 결과가 나온다", async () => {
    let hits = 0;
    server.use(
      http.get("*/api/v1/tags/popular", () => {
        hits += 1;
        if (hits === 1) {
          return HttpResponse.json(
            { code: "INTERNAL_ERROR", message: "태그를 불러오지 못했습니다." },
            { status: 500 },
          );
        }
        return HttpResponse.json(buildResponse([{ name: "frontend", usageCount: 1 }]));
      }),
    );

    const { Wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<TagCloud />, { wrapper: Wrapper });

    expect(await screen.findByText("태그를 불러오지 못했습니다.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    await waitFor(() =>
      expect(screen.getByRole("link", { name: /#frontend/ })).toBeInTheDocument(),
    );
  });
});
