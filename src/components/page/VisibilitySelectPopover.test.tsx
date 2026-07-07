import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { visibilityDescription } from "@/lib/page/visibility";

import { VisibilitySelectPopover } from "./VisibilitySelectPopover";

describe("VisibilitySelectPopover", () => {
  it("초기 상태는 닫힘 — 현재 값의 라벨이 trigger 에 노출된다", () => {
    render(<VisibilitySelectPopover value="DRAFT" onValueChange={() => {}} />);

    const trigger = screen.getByRole("button", { name: /공개 범위 변경/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveTextContent("초안");
  });

  it("trigger 클릭 시 popover 가 열리고 내부 VisibilitySelect 가 노출된다", async () => {
    const user = userEvent.setup();
    render(<VisibilitySelectPopover value="INTERNAL" onValueChange={() => {}} />);

    await user.click(screen.getByRole("button", { name: /공개 범위 변경/ }));

    expect(screen.getByRole("button", { name: /공개 범위 변경/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByLabelText("공개 범위")).toBeInTheDocument();
    // description 문구는 lib 소스와 sync — 하드코딩 회귀 방지.
    expect(screen.getByText(visibilityDescription("INTERNAL"))).toBeInTheDocument();
  });

  it("popover 안 옵션 선택 시 onValueChange 가 호출된다", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<VisibilitySelectPopover value="DRAFT" onValueChange={onValueChange} />);

    await user.click(screen.getByRole("button", { name: /공개 범위 변경/ }));
    await user.click(screen.getByLabelText("공개 범위"));
    await user.click(await screen.findByRole("option", { name: /^공개$/ }));

    expect(onValueChange).toHaveBeenCalledWith("PUBLIC");
  });

  it("옵션 선택 후에도 외부 popover 는 열림 상태를 유지한다 (nested layer 회귀 방지)", async () => {
    const user = userEvent.setup();
    render(<VisibilitySelectPopover value="DRAFT" onValueChange={() => {}} />);

    await user.click(screen.getByRole("button", { name: /공개 범위 변경/ }));
    await user.click(screen.getByLabelText("공개 범위"));
    await user.click(await screen.findByRole("option", { name: /^공개$/ }));

    // Select popup 은 닫히지만 outer Popover 는 유지 — base-ui nested layer 상호작용이
    // library upgrade 에서 회귀할 가능성이 있는 지점이라 명시 assert.
    expect(screen.getByRole("button", { name: /공개 범위 변경/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("disabled 이면 trigger 가 눌러지지 않고 popover 도 열리지 않는다", async () => {
    const user = userEvent.setup();
    render(<VisibilitySelectPopover value="DRAFT" onValueChange={() => {}} disabled />);

    const trigger = screen.getByRole("button", { name: /공개 범위 변경/ });
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("공개 범위")).not.toBeInTheDocument();
  });

  it("Escape 로 popover 가 닫힌다", async () => {
    const user = userEvent.setup();
    render(<VisibilitySelectPopover value="DRAFT" onValueChange={() => {}} />);

    await user.click(screen.getByRole("button", { name: /공개 범위 변경/ }));
    expect(screen.getByRole("button", { name: /공개 범위 변경/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: /공개 범위 변경/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("cascade blocked 옵션은 popover 안 select 에서도 disabled 로 노출된다", async () => {
    const user = userEvent.setup();
    render(
      <VisibilitySelectPopover value="DRAFT" onValueChange={() => {}} spaceVisibility="INTERNAL" />,
    );

    await user.click(screen.getByRole("button", { name: /공개 범위 변경/ }));
    await user.click(screen.getByLabelText("공개 범위"));

    expect(await screen.findByRole("option", { name: /^공개/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
