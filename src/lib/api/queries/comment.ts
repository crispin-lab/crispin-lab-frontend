import { queryOptions } from "@tanstack/react-query";

import type { ApiError } from "../client";
import { type CommentListParams, listComments } from "../comment";
import type { PageId } from "../ids";
import type { CommentListResult } from "../types";

export const commentKeys = {
  all: ["comment"] as const,
  lists: () => [...commentKeys.all, "list"] as const,
  list: (pageId: PageId, params: CommentListParams = {}) =>
    [...commentKeys.lists(), pageId, params] as const,
  pageLists: (pageId: PageId) => [...commentKeys.lists(), pageId] as const,
};

export function commentListOptions(pageId: PageId, params: CommentListParams = {}) {
  return queryOptions<CommentListResult, ApiError>({
    queryKey: commentKeys.list(pageId, params),
    queryFn: ({ signal }) => listComments(pageId, params, signal),
    // 댓글은 실시간성 — 다른 사용자 등록이 빠르게 반영되도록 always stale.
    staleTime: 0,
  });
}
