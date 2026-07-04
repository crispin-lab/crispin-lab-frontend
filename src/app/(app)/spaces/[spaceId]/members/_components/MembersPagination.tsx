"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { SpaceId } from "@/lib/api/ids";

import { MEMBERS_DEFAULT_SIZE } from "./constants";

type Props = {
  spaceId: SpaceId;
  page: number;
  size: number;
  totalPages: number;
};

export function MembersPagination({ spaceId, page, size, totalPages }: Props) {
  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;

  return (
    <nav
      aria-label="멤버 페이지 이동"
      className="flex items-center justify-between gap-3 pt-2 text-sm"
    >
      <span className="text-muted-foreground">
        {page + 1} / {totalPages}
      </span>
      <div className="flex gap-2">
        {hasPrev ? (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={buildMembersHref(spaceId, page - 1, size)}>이전</Link>}
          />
        ) : (
          <Button variant="outline" size="sm" disabled>
            이전
          </Button>
        )}
        {hasNext ? (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={buildMembersHref(spaceId, page + 1, size)}>다음</Link>}
          />
        ) : (
          <Button variant="outline" size="sm" disabled>
            다음
          </Button>
        )}
      </div>
    </nav>
  );
}

function buildMembersHref(spaceId: SpaceId, page: number, size: number): string {
  const params = new URLSearchParams();
  if (page > 0) params.set("page", String(page));
  if (size !== MEMBERS_DEFAULT_SIZE) params.set("size", String(size));
  const qs = params.toString();
  const base = `/spaces/${encodeURIComponent(spaceId)}/members`;
  return qs === "" ? base : `${base}?${qs}`;
}
