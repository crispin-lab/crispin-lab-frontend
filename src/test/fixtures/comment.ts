import type { CommentListResult, CommentSummary } from "@/lib/api/types";

// 댓글 본문 저장 계약 — serializeEditorContent(editor.getJSON()) 의 정규형.
// fixture / mock 이 이 형식을 따르지 않으면 본문 직렬화 회귀를 테스트가 못 잡는다.
export const DEFAULT_FIXTURE_COMMENT_BODY = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "안녕하세요" }] }],
});

export function commentSummary(overrides: Partial<CommentSummary> = {}): CommentSummary {
  return {
    commentId: "c_1",
    pageId: "p_1",
    authorId: "u_01HXTEST00000000FIXTURE0",
    authorHandle: "tester",
    body: DEFAULT_FIXTURE_COMMENT_BODY,
    canEdit: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function commentListBody(
  items: CommentSummary[] = [commentSummary()],
  overrides: Partial<CommentListResult> = {},
): CommentListResult {
  return {
    items,
    page: 0,
    size: 20,
    totalElements: items.length,
    totalPages: items.length === 0 ? 0 : 1,
    hasNext: false,
    isEmpty: items.length === 0,
    ...overrides,
  };
}
