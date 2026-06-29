"use client";

import type { UseQueryResult } from "@tanstack/react-query";

import { ErrorRetryCard } from "@/components/ErrorRetryCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommentList } from "@/hooks/useComment";
import type { ApiError } from "@/lib/api/client";
import { COMMENT_LIST_SIZE } from "@/lib/api/comment";
import { toUserMessage } from "@/lib/api/errors";
import type { PageId, SpaceId } from "@/lib/api/ids";
import type { CommentListResult } from "@/lib/api/types";
import type { Visibility } from "@/lib/page/visibility";
import { cn } from "@/lib/utils";

import { CommentComposeForm } from "./CommentComposeForm";
import { CommentRow } from "./CommentRow";
import { PageLinkChipNavigator } from "./PageLinkChipNavigator";

type Props = {
  pageId: PageId;
  spaceId: SpaceId;
  sourceVisibility: Visibility;
  canComment: boolean;
  className?: string;
};

export function CommentThread({ pageId, spaceId, sourceVisibility, canComment, className }: Props) {
  // BE 의 comment list endpoint 가 auth 필수 — 비로그인 사용자에게는 호출하면 401 → "세션이 유효하지 않습니다" 노이즈.
  // canComment === false 의 한 경우가 비로그인이라 같은 게이트로 흡수.
  const query = useCommentList(pageId, { size: COMMENT_LIST_SIZE }, { enabled: canComment });

  return (
    <section className={cn("flex flex-col gap-4", className)} aria-labelledby="comment-heading">
      <h2 id="comment-heading" className="text-xl font-semibold">
        댓글
      </h2>

      {canComment ? (
        <>
          <CommentComposeForm
            pageId={pageId}
            spaceId={spaceId}
            sourceVisibility={sourceVisibility}
          />
          <CommentListBody
            pageId={pageId}
            spaceId={spaceId}
            sourceVisibility={sourceVisibility}
            query={query}
          />
        </>
      ) : (
        <p className="text-muted-foreground border-border rounded-md border border-dashed px-4 py-3 text-sm">
          댓글을 남기려면 로그인해 주세요.
        </p>
      )}
    </section>
  );
}

type ListBodyProps = {
  pageId: PageId;
  spaceId: SpaceId;
  sourceVisibility: Visibility;
  query: UseQueryResult<CommentListResult, ApiError>;
};

function CommentListBody({ pageId, spaceId, sourceVisibility, query }: ListBodyProps) {
  if (query.isPending) {
    return <CommentListSkeleton />;
  }

  if (query.isError) {
    return (
      <ErrorRetryCard
        message={toUserMessage(query.error)}
        onRetry={() => query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  if (query.data.items.length === 0) {
    return <p className="text-muted-foreground text-sm italic">아직 댓글이 없습니다.</p>;
  }

  return (
    <PageLinkChipNavigator>
      <ul className="divide-border divide-y border-y">
        {query.data.items.map((comment) => (
          <CommentRow
            key={comment.commentId}
            comment={comment}
            pageId={pageId}
            spaceId={spaceId}
            sourceVisibility={sourceVisibility}
          />
        ))}
      </ul>
    </PageLinkChipNavigator>
  );
}

function CommentListSkeleton() {
  return (
    <ul role="status" aria-label="댓글 불러오는 중" className="divide-border divide-y border-y">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex flex-col gap-2 py-4">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </li>
      ))}
    </ul>
  );
}
