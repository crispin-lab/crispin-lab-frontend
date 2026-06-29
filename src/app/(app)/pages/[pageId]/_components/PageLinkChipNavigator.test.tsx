import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { PageLinkChipNavigator } from "./PageLinkChipNavigator";

describe("PageLinkChipNavigator", () => {
  it("chip 클릭 시 router.push 로 /pages/{pageId} 로 이동한다", async () => {
    const user = userEvent.setup();
    pushMock.mockReset();

    render(
      <PageLinkChipNavigator>
        <p>
          본문{" "}
          <span data-page-link="" data-page-id="p_target" role="link" tabIndex={0}>
            회의록
          </span>
        </p>
      </PageLinkChipNavigator>,
    );

    await user.click(screen.getByText("회의록"));

    expect(pushMock).toHaveBeenCalledWith("/pages/p_target");
  });

  it("chip 에 focus 후 Enter 키를 누르면 동일하게 이동한다", async () => {
    const user = userEvent.setup();
    pushMock.mockReset();

    render(
      <PageLinkChipNavigator>
        <span data-page-link="" data-page-id="p_target" role="link" tabIndex={0}>
          회의록
        </span>
      </PageLinkChipNavigator>,
    );

    screen.getByText("회의록").focus();
    await user.keyboard("{Enter}");

    expect(pushMock).toHaveBeenCalledWith("/pages/p_target");
  });

  it("data-page-id 에 특수문자가 있으면 encodeURIComponent 후 push 된다", async () => {
    const user = userEvent.setup();
    pushMock.mockReset();

    render(
      <PageLinkChipNavigator>
        <span data-page-link="" data-page-id="a/b?c#d" role="link" tabIndex={0}>
          이상한 페이지
        </span>
      </PageLinkChipNavigator>,
    );

    await user.click(screen.getByText("이상한 페이지"));

    expect(pushMock).toHaveBeenCalledWith("/pages/a%2Fb%3Fc%23d");
  });

  it("chip 이 아닌 본문 click 은 navigation 을 트리거하지 않는다", async () => {
    const user = userEvent.setup();
    pushMock.mockReset();

    render(
      <PageLinkChipNavigator>
        <p>일반 본문 텍스트</p>
      </PageLinkChipNavigator>,
    );

    await user.click(screen.getByText("일반 본문 텍스트"));

    expect(pushMock).not.toHaveBeenCalled();
  });

  it("편집 영역 (ProseMirror / contenteditable) 안의 chip click 은 navigation 을 건너뛴다 (caret 이동 의도 보존, 작성 내용 손실 회피)", async () => {
    const user = userEvent.setup();
    pushMock.mockReset();

    render(
      <PageLinkChipNavigator>
        <div className="ProseMirror" contentEditable suppressContentEditableWarning>
          <span data-page-link="" data-page-id="p_target" role="link" tabIndex={0}>
            편집 중 chip
          </span>
        </div>
      </PageLinkChipNavigator>,
    );

    await user.click(screen.getByText("편집 중 chip"));

    expect(pushMock).not.toHaveBeenCalled();
  });
});
