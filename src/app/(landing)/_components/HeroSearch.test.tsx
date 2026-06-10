import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

import { HeroSearch } from "./HeroSearch";

describe("HeroSearch", () => {
  beforeEach(() => {
    routerPush.mockReset();
  });

  it("query 입력 후 submit 시 /search?query=... 로 push 한다", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const input = screen.getByRole("searchbox", { name: "검색" });
    await user.type(input, "위키 링크{Enter}");

    expect(routerPush).toHaveBeenCalledWith(
      "/search?query=%EC%9C%84%ED%82%A4%20%EB%A7%81%ED%81%AC",
    );
  });

  it("공백만 있는 query 는 submit 해도 push 가 호출되지 않는다", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />);

    const input = screen.getByRole("searchbox", { name: "검색" });
    await user.type(input, "   {Enter}");

    expect(routerPush).not.toHaveBeenCalled();
  });
});
