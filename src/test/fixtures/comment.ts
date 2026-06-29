import type { CommentListResult, CommentSummary } from "@/lib/api/types";

export function commentSummary(overrides: Partial<CommentSummary> = {}): CommentSummary {
  return {
    commentId: "c_1",
    pageId: "p_1",
    authorId: "u_01HXTEST00000000FIXTURE0",
    authorHandle: "tester",
    body: "안녕하세요",
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
