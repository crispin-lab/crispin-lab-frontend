import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { asPageId, asSpaceId } from "@/lib/api/ids";
import { server } from "@/mocks/server";
import { commentListBody, commentSummary } from "@/test/fixtures/comment";
import { createQueryWrapper } from "@/test/queryWrapper";

vi.mock("@/components/editor/CommentEditor", () => ({
  CommentEditor: ({
    initialContent,
    placeholder,
    onChange,
  }: {
    initialContent?: string;
    placeholder?: string;
    onChange?: (next: string, isEmpty: boolean) => void;
  }) => (
    <textarea
      aria-label={placeholder ?? "댓글 본문 (mock)"}
      data-initial={initialContent ?? ""}
      onChange={(event) => {
        // 실제 CommentEditor 와 같은 계약 — JSON.stringify(JSONContent) 를 onChange 로 전달.
        // mock 이 raw text 를 흘리면 본문 직렬화 회귀를 테스트가 못 잡는다.
        const text = event.target.value;
        const doc =
          text === ""
            ? { type: "doc", content: [{ type: "paragraph" }] }
            : { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
        onChange?.(JSON.stringify(doc), text === "");
      }}
    />
  ),
}));

// PageLinkChipNavigator 는 next/navigation 의 useRouter 를 사용 — mock 으로 우회.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { CommentThread } from "./CommentThread";

const PAGE_ID_RAW = "p_1";
const PAGE_ID = asPageId(PAGE_ID_RAW);
const SPACE_ID = asSpaceId("s_1");

function renderThread({ canComment = true }: { canComment?: boolean } = {}) {
  const { Wrapper } = createQueryWrapper();
  return render(
    <CommentThread
      pageId={PAGE_ID}
      spaceId={SPACE_ID}
      sourceVisibility="PUBLIC"
      canComment={canComment}
    />,
    { wrapper: Wrapper },
  );
}

beforeEach(() => {
  server.resetHandlers();
});

describe("CommentThread", () => {
  it("결과 목록을 작성자 / 본문 / 시간 메타와 함께 렌더한다", async () => {
    server.use(
      http.get(`*/api/v1/pages/${PAGE_ID_RAW}/comments`, () =>
        HttpResponse.json(
          commentListBody([
            commentSummary({
              commentId: "c_1",
              body: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"첫 댓글"}]}]}',
              authorHandle: "alice",
              createdAt: "2026-03-01T00:00:00Z",
              updatedAt: "2026-03-05T00:00:00Z",
            }),
          ]),
        ),
      ),
    );

    renderThread();

    expect(await screen.findByText("첫 댓글")).toBeInTheDocument();
    expect(screen.getByText("@alice")).toBeInTheDocument();
    // 시간 메타 — formatUpdatedAtKR 결과. createdAt 과 updatedAt 이 다르면 두 줄 모두 노출.
    const created = screen.getByText(
      (_, node) =>
        node?.tagName === "TIME" && node.getAttribute("datetime") === "2026-03-01T00:00:00Z",
    );
    expect(created).toBeInTheDocument();
    expect(created.textContent).toMatch(/2026/);
    const updated = screen.getByText(
      (_, node) =>
        node?.tagName === "TIME" && node.getAttribute("datetime") === "2026-03-05T00:00:00Z",
    );
    expect(updated).toBeInTheDocument();
    expect(updated.textContent).toMatch(/수정/);
  });

  it("빈 결과면 '아직 댓글이 없습니다' 안내가 나온다", async () => {
    server.use(
      http.get(`*/api/v1/pages/${PAGE_ID_RAW}/comments`, () =>
        HttpResponse.json(commentListBody([])),
      ),
    );

    renderThread();

    expect(await screen.findByText("아직 댓글이 없습니다.")).toBeInTheDocument();
  });

  it("에러면 ErrorRetryCard 로 사용자 메시지를 노출한다", async () => {
    server.use(
      http.get(`*/api/v1/pages/${PAGE_ID_RAW}/comments`, () =>
        HttpResponse.json(
          { code: "INTERNAL", message: "서버에 일시적인 문제가 발생했습니다." },
          { status: 500 },
        ),
      ),
    );

    renderThread();

    expect(await screen.findByText("서버에 일시적인 문제가 발생했습니다.")).toBeInTheDocument();
  });

  it("authorHandle 이 빈 문자열이면 '삭제된 사용자' 라벨로 표시한다", async () => {
    server.use(
      http.get(`*/api/v1/pages/${PAGE_ID_RAW}/comments`, () =>
        HttpResponse.json(commentListBody([commentSummary({ authorHandle: "" })])),
      ),
    );

    renderThread();

    expect(await screen.findByText("삭제된 사용자")).toBeInTheDocument();
  });

  it("canEdit = false 인 댓글은 수정 / 삭제 버튼이 노출되지 않는다", async () => {
    server.use(
      http.get(`*/api/v1/pages/${PAGE_ID_RAW}/comments`, () =>
        HttpResponse.json(commentListBody([commentSummary({ canEdit: false })])),
      ),
    );

    renderThread();

    await screen.findByText("@tester");
    expect(screen.queryByRole("button", { name: "수정" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
  });

  it("canEdit = true 인 댓글은 수정 / 삭제 버튼이 노출된다", async () => {
    server.use(
      http.get(`*/api/v1/pages/${PAGE_ID_RAW}/comments`, () =>
        HttpResponse.json(commentListBody([commentSummary({ canEdit: true })])),
      ),
    );

    renderThread();

    await screen.findByText("@tester");
    expect(screen.getByRole("button", { name: "수정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
  });

  it("canComment 가 false 인 사용자는 등록 폼 / 목록 자리에 안내 문구만 본다 (list 호출 자체를 건너뛴다)", async () => {
    let listCalled = false;
    server.use(
      http.get(`*/api/v1/pages/${PAGE_ID_RAW}/comments`, () => {
        listCalled = true;
        return HttpResponse.json(commentListBody([]));
      }),
    );

    renderThread({ canComment: false });

    expect(await screen.findByText("댓글을 남기려면 로그인해 주세요.")).toBeInTheDocument();
    expect(screen.queryByLabelText("댓글을 남겨 보세요.")).not.toBeInTheDocument();
    // 목록 / skeleton / error UI 어느 것도 노출되지 않는다 — 401 노이즈 회피.
    expect(screen.queryByText("아직 댓글이 없습니다.")).not.toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "댓글 불러오는 중" })).not.toBeInTheDocument();
    // 안내 문구가 paint 된 뒤에도 list 호출은 일어나지 않았다.
    expect(listCalled).toBe(false);
  });

  it("등록 mutation 성공 시 list 가 invalidate 되어 새 댓글이 노출된다", async () => {
    let listCallCount = 0;
    const newCommentBody = JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "방금 등록한 댓글" }] }],
    });
    server.use(
      http.get(`*/api/v1/pages/${PAGE_ID_RAW}/comments`, () => {
        listCallCount += 1;
        const items =
          listCallCount === 1 ? [] : [commentSummary({ body: newCommentBody, authorHandle: "me" })];
        return HttpResponse.json(commentListBody(items));
      }),
      http.post(`*/api/v1/pages/${PAGE_ID_RAW}/comments`, () =>
        HttpResponse.json({ commentId: "c_new" }, { status: 201 }),
      ),
    );

    renderThread();

    expect(await screen.findByText("아직 댓글이 없습니다.")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("댓글을 남겨 보세요."), "방금 등록한 댓글");
    await user.click(screen.getByRole("button", { name: "등록" }));

    await waitFor(() => {
      expect(screen.getByText("방금 등록한 댓글")).toBeInTheDocument();
    });
  });

  it("삭제는 confirm dialog 를 거쳐 DELETE 를 호출한다", async () => {
    let deleteCalled = false;
    server.use(
      http.get(`*/api/v1/pages/${PAGE_ID_RAW}/comments`, () => {
        if (deleteCalled) return HttpResponse.json(commentListBody([]));
        return HttpResponse.json(commentListBody([commentSummary({ canEdit: true })]));
      }),
      http.delete(`*/api/v1/pages/${PAGE_ID_RAW}/comments/c_1`, () => {
        deleteCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderThread();

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "삭제" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "삭제" }));

    await waitFor(() => {
      expect(deleteCalled).toBe(true);
    });
    await waitFor(() => {
      expect(screen.getByText("아직 댓글이 없습니다.")).toBeInTheDocument();
    });
  });
});
