import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CodeBlockCopyMounter } from "./CodeBlockCopyMounter";

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  return {
    writeText,
    restore: () => {
      if (original) Object.defineProperty(navigator, "clipboard", original);
      else delete (navigator as { clipboard?: unknown }).clipboard;
    },
  };
}

describe("CodeBlockCopyMounter", () => {
  const stubs: { restore: () => void }[] = [];
  afterEach(() => {
    while (stubs.length > 0) stubs.pop()?.restore();
  });

  it("정적 HTML 의 각 <pre> 에 복사 버튼을 주입한다", () => {
    render(
      <CodeBlockCopyMounter>
        <div
          dangerouslySetInnerHTML={{
            __html:
              '<pre><code class="hljs language-typescript">const a = 1;</code></pre>' +
              '<pre><code class="hljs language-bash">echo hi</code></pre>',
          }}
        />
      </CodeBlockCopyMounter>,
    );

    expect(screen.getAllByRole("button", { name: "코드 복사" })).toHaveLength(2);
  });

  it("복사 버튼 클릭 시 해당 <code> 의 textContent 를 clipboard 에 쓴다", async () => {
    const user = userEvent.setup();
    // setup 이후에 stub — userEvent 가 자체 clipboard 를 셋업하면서 덮어쓰는 회귀 회피.
    const stub = stubClipboard();
    stubs.push(stub);
    render(
      <CodeBlockCopyMounter>
        <div
          dangerouslySetInnerHTML={{
            __html:
              '<pre><code class="hljs language-typescript">const greeting = "hi";</code></pre>',
          }}
        />
      </CodeBlockCopyMounter>,
    );

    const button = screen.getByRole("button", { name: "코드 복사" });
    await user.click(button);

    expect(stub.writeText).toHaveBeenCalledWith('const greeting = "hi";');
    await waitFor(() => expect(button).toHaveTextContent("복사됨"));
  });
});
