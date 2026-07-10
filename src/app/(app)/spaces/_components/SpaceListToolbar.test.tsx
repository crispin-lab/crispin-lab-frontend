import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

import { SpaceListToolbar } from "./SpaceListToolbar";

describe("SpaceListToolbar", () => {
  beforeEach(() => {
    routerPush.mockReset();
    vi.useRealTimers();
  });

  it("키워드 입력을 300ms 디바운스 후 URL push", async () => {
    vi.useFakeTimers();
    // fake timer 환경에서 userEvent.type 의 내부 지연이 stall — fireEvent 로 native change 이벤트 직접 발화.
    render(<SpaceListToolbar current={{}} totalElements={0} />);

    const input = screen.getByLabelText("스페이스 이름 검색") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "위키" } });

    // 아직 디바운스가 끝나지 않아 push 미발화.
    expect(routerPush).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // URLSearchParams 가 한글을 percent-encode. 백엔드는 decode 해서 받는다.
    expect(routerPush).toHaveBeenCalledWith(`/spaces?keyword=${encodeURIComponent("위키")}`);
  });

  it("정렬 옵션 선택 시 즉시 URL push (디바운스 없음)", async () => {
    const user = userEvent.setup();

    render(<SpaceListToolbar current={{}} totalElements={0} />);

    // Select trigger 를 role=combobox 로 접근.
    const trigger = screen.getByRole("combobox", { name: "정렬" });
    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: "이름순" }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/spaces?sort=NAME"));
  });

  it("current.keyword 가 바뀌면 draft 도 동기된다 (뒤로가기 대응)", async () => {
    const { rerender } = render(
      <SpaceListToolbar current={{ keyword: "위키" }} totalElements={5} />,
    );

    const input = screen.getByLabelText("스페이스 이름 검색") as HTMLInputElement;
    expect(input.value).toBe("위키");

    rerender(<SpaceListToolbar current={{}} totalElements={5} />);
    expect(input.value).toBe("");
  });

  it("결과 요약이 총 N개 형식 + sr-only label 로 스크린 리더에 안내된다", () => {
    render(<SpaceListToolbar current={{}} totalElements={7} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("총 스페이스 수: 총 7개");
  });

  it("totalElements 미확정 시 layout jump 방지를 위해 placeholder(…)", () => {
    render(<SpaceListToolbar current={{}} totalElements={undefined} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("총 스페이스 수: …");
  });

  // combined-intent race (debounce 창 안에 정렬을 바꿔도 draft 를 함께 push) 회귀는 pure function 인
  // buildSortChangePatch 단위 테스트가 커버. 컴포넌트 통합에서는 sort click → router.push 만 확인.
});
