import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { routerPush, routerReplace } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush, replace: routerReplace }),
}));

import { SpaceListToolbar } from "./SpaceListToolbar";

describe("SpaceListToolbar", () => {
  beforeEach(() => {
    routerPush.mockReset();
    routerReplace.mockReset();
    vi.useRealTimers();
  });

  it("키워드 입력은 300ms 디바운스 후 router.replace — 타이핑 pause 마다 history 오염을 방지", async () => {
    vi.useFakeTimers();
    // fake timer 환경에서 userEvent.type 의 내부 지연이 stall — fireEvent 로 native change 이벤트 직접 발화.
    render(<SpaceListToolbar current={{}} totalElements={0} />);

    const input = screen.getByLabelText("스페이스 이름 검색") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "위키" } });

    expect(routerReplace).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // URLSearchParams 가 한글을 percent-encode. 백엔드는 decode 해서 받는다.
    expect(routerReplace).toHaveBeenCalledWith(`/spaces?keyword=${encodeURIComponent("위키")}`);
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("외부에서 URL 이 바뀌면 pending debounce timer 도 취소 — stale draft 로 방금 완료된 navigation 을 덮지 않는다", async () => {
    vi.useFakeTimers();
    const { rerender } = render(<SpaceListToolbar current={{}} totalElements={0} />);

    const input = screen.getByLabelText("스페이스 이름 검색") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "B" } });

    // 300ms 내에 외부 URL 변경 (뒤로가기 등) 이 발생.
    rerender(<SpaceListToolbar current={{ keyword: "A" }} totalElements={0} />);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Timer 가 취소돼 replace 는 발화하지 않는다.
    expect(routerReplace).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("router.replace 로 되돌아온 self-echo 는 draft 를 리셋하지 않는다 — 이어 친 입력을 잃지 않게", async () => {
    vi.useFakeTimers();
    const { rerender } = render(<SpaceListToolbar current={{}} totalElements={0} />);

    const input = screen.getByLabelText("스페이스 이름 검색") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "위" } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Self-echo 재-렌더 전에 사용자가 이어서 입력.
    fireEvent.change(input, { target: { value: "위키" } });

    // Parent 가 self-echo (첫 commit 결과) 로 re-render 되는 시점을 시뮬레이션.
    rerender(<SpaceListToolbar current={{ keyword: "위" }} totalElements={0} />);

    // Draft 가 self-echo 로 "위" 로 되돌아가지 않고 "위키" 를 유지.
    expect(input.value).toBe("위키");

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // 두 번째 debounce 도 정상 발화.
    expect(routerReplace).toHaveBeenLastCalledWith(`/spaces?keyword=${encodeURIComponent("위키")}`);
    expect(routerReplace).toHaveBeenCalledTimes(2);
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
