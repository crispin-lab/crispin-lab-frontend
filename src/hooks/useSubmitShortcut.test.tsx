import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { useSubmitShortcut } from "./useSubmitShortcut";

function Harness({ onSubmit }: { onSubmit: () => void }) {
  useSubmitShortcut(onSubmit);
  return null;
}

function ContainedHarness({ onSubmit }: { onSubmit: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useSubmitShortcut(onSubmit, ref);
  return (
    <>
      <div ref={ref} data-testid="inside">
        <input data-testid="inside-input" />
      </div>
      <input data-testid="outside-input" />
    </>
  );
}

describe("useSubmitShortcut", () => {
  it("Cmd+S 가 submit 을 호출한다", async () => {
    const submit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={submit} />);

    await user.keyboard("{Meta>}s{/Meta}");
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+S 도 submit 을 호출한다", async () => {
    const submit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={submit} />);

    await user.keyboard("{Control>}s{/Control}");
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("IME composition 중에는 submit 을 호출하지 않는다", async () => {
    const submit = vi.fn();
    render(<Harness onSubmit={submit} />);

    const event = new KeyboardEvent("keydown", {
      key: "s",
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, "isComposing", { value: true });
    document.dispatchEvent(event);

    await Promise.resolve();
    expect(submit).not.toHaveBeenCalled();
  });

  it("매 render 마다 latest submit closure 를 호출한다", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Harness onSubmit={first} />);

    rerender(<Harness onSubmit={second} />);
    await user.keyboard("{Meta>}s{/Meta}");

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("unmount 후에는 listener 가 제거된다", async () => {
    const submit = vi.fn();
    const user = userEvent.setup();
    const { unmount } = render(<Harness onSubmit={submit} />);

    unmount();
    await user.keyboard("{Meta>}s{/Meta}");
    expect(submit).not.toHaveBeenCalled();
  });

  it("containerRef 가 주어지면 container 안의 keydown 만 submit 을 트리거한다", async () => {
    const submit = vi.fn();
    const user = userEvent.setup();
    const { getByTestId } = render(<ContainedHarness onSubmit={submit} />);

    const inside = getByTestId("inside-input");
    inside.focus();
    await user.keyboard("{Meta>}s{/Meta}");
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("containerRef 가 주어지면 container 밖의 keydown 은 무시된다 — portal modal/popover 보호", async () => {
    const submit = vi.fn();
    const user = userEvent.setup();
    const { getByTestId } = render(<ContainedHarness onSubmit={submit} />);

    const outside = getByTestId("outside-input");
    outside.focus();
    await user.keyboard("{Meta>}s{/Meta}");
    expect(submit).not.toHaveBeenCalled();
  });
});
