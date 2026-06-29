import { apiFetch } from "./client";
import type { CommentId, PageId } from "./ids";
import type {
  CommentEditRequest,
  CommentEditResult,
  CommentListResult,
  CommentRegisterRequest,
  CommentRegisterResult,
} from "./types";

export type CommentListParams = {
  page?: number;
  size?: number;
};

// BE 디폴트에 의존하지 않도록 명시. 페이지네이션 UI 가 들어오기 전엔 한 페이지로 보이는 상한.
export const COMMENT_LIST_SIZE = 20;

export function listComments(
  pageId: PageId,
  params: CommentListParams = {},
  signal?: AbortSignal,
): Promise<CommentListResult> {
  const search = buildListCommentsQuery(params);
  const base = `/api/v1/pages/${encodeURIComponent(pageId)}/comments`;
  const path = search === "" ? base : `${base}?${search}`;
  return apiFetch<CommentListResult>(path, { signal });
}

export function registerComment(
  pageId: PageId,
  body: CommentRegisterRequest,
): Promise<CommentRegisterResult> {
  return apiFetch<CommentRegisterResult>(`/api/v1/pages/${encodeURIComponent(pageId)}/comments`, {
    method: "POST",
    body,
  });
}

export function editComment(
  pageId: PageId,
  commentId: CommentId,
  body: CommentEditRequest,
): Promise<CommentEditResult> {
  return apiFetch<CommentEditResult>(
    `/api/v1/pages/${encodeURIComponent(pageId)}/comments/${encodeURIComponent(commentId)}`,
    { method: "PUT", body },
  );
}

export function deleteComment(pageId: PageId, commentId: CommentId): Promise<void> {
  return apiFetch<void>(
    `/api/v1/pages/${encodeURIComponent(pageId)}/comments/${encodeURIComponent(commentId)}`,
    { method: "DELETE" },
  );
}

function buildListCommentsQuery(params: CommentListParams): string {
  const search = new URLSearchParams();
  if (params.page !== undefined) {
    search.append("page", String(params.page));
  }
  if (params.size !== undefined) {
    search.append("size", String(params.size));
  }
  return search.toString();
}
