import {
  useInfiniteQuery,
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";

import { type ApiError } from "@/lib/api/client";
import {
  type CommentListParams,
  deleteComment,
  editComment,
  registerComment,
} from "@/lib/api/comment";
import type { CommentId, PageId } from "@/lib/api/ids";
import { commentKeys, commentListOptions } from "@/lib/api/queries/comment";
import type {
  CommentEditRequest,
  CommentEditResult,
  CommentRegisterRequest,
  CommentRegisterResult,
} from "@/lib/api/types";

type CommentInfiniteParams = Omit<CommentListParams, "page">;

// 사용처가 현재 enabled 하나만 필요 — overrides 전체를 타입화하면 infinite query 의 select 시그니처와 충돌해 복잡. 본 hook 에 필요한 것만 노출.
type CommentListOverrides = {
  enabled?: boolean;
};

export function useCommentList(
  pageId: PageId,
  params: CommentInfiniteParams = {},
  overrides?: CommentListOverrides,
) {
  return useInfiniteQuery({ ...commentListOptions(pageId, params), ...overrides });
}

export function useCommentRegister(
  pageId: PageId,
): UseMutationResult<CommentRegisterResult, ApiError, CommentRegisterRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => registerComment(pageId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: commentKeys.pageLists(pageId) });
    },
  });
}

export function useCommentEdit(
  pageId: PageId,
  commentId: CommentId,
): UseMutationResult<CommentEditResult, ApiError, CommentEditRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => editComment(pageId, commentId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: commentKeys.pageLists(pageId) });
    },
  });
}

export function useCommentDelete(pageId: PageId): UseMutationResult<void, ApiError, CommentId> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId) => deleteComment(pageId, commentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: commentKeys.pageLists(pageId) });
    },
  });
}
