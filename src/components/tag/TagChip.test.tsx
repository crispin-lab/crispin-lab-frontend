import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TagChip } from "./TagChip";

describe("TagChip", () => {
  it("href 가 주어지면 link 로 렌더되고 #이름 텍스트가 보인다", () => {
    render(<TagChip name="frontend" href="/search?tag=frontend" />);
    const link = screen.getByRole("link", { name: /#frontend/ });
    expect(link).toHaveAttribute("href", "/search?tag=frontend");
  });

  it("trailing 가 주어지면 chip 뒤에 함께 렌더된다", () => {
    render(
      <TagChip
        name="위키"
        href={`/search?tag=${encodeURIComponent("위키")}`}
        trailing={<span data-testid="count">12</span>}
      />,
    );
    expect(screen.getByTestId("count")).toBeInTheDocument();
  });

  it("onRemove 가 주어지면 × 버튼이 노출되고 클릭 시 콜백이 실행된다", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(<TagChip name="frontend" onRemove={onRemove} />);
    await user.click(screen.getByRole("button", { name: /frontend.*제거/ }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("disabled 면 × 버튼 클릭이 무시된다", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(<TagChip name="frontend" onRemove={onRemove} disabled />);
    const button = screen.getByRole("button", { name: /frontend.*제거/ });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("removeAriaLabel 을 명시하면 그 라벨이 우선된다", () => {
    render(<TagChip name="frontend" onRemove={() => {}} removeAriaLabel="이 태그 떼기" />);
    expect(screen.getByRole("button", { name: "이 태그 떼기" })).toBeInTheDocument();
  });

  it("name 이 빈 문자열이면 fallback 라벨이 italic 으로 노출된다", () => {
    render(<TagChip name="" />);
    expect(screen.getByText("이름 없는 태그")).toBeInTheDocument();
  });

  it("name 이 빈 문자열이고 onRemove 가 있으면 × 버튼 aria-label 이 fallback 라벨을 사용한다", () => {
    render(<TagChip name="" onRemove={() => {}} />);
    expect(screen.getByRole("button", { name: "이름 없는 태그 제거" })).toBeInTheDocument();
  });
});
