"use client";

import { TagChip } from "@/components/tag/TagChip";
import { usePageTagList } from "@/hooks/usePageTag";
import type { PageId } from "@/lib/api/ids";
import { cn } from "@/lib/utils";

type Props = {
  pageId: PageId;
  className?: string;
};

export function PageTagList({ pageId, className }: Props) {
  const { data, isPending, isError } = usePageTagList(pageId);
  // 태그는 보조 정보 — pending / error 일 때 row 자체 미렌더. 리딩 화면 메타 위계상 silent fail.
  if (isPending || isError) return null;
  if (data.items.length === 0) return null;
  // chip 클릭은 *해당 태그로의 단순 진입* — 직전 화면의 `?tag=A&tag=B` 같은 multi-filter 는 의도적으로 reset.
  // searchParams.ts 가 string[] 을 받지만 reading 흐름에서 누적시키지 않는다.
  // navigation 값은 `tag.tagId` — BE `/v1/pages?tag=...` 가 tagId format 을 strict 검증해 name 을 보내면 400 INVALID_REQUEST.
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {data.items.map((tag) => (
        <li key={tag.tagId}>
          <TagChip name={tag.name} href={`/search?tag=${encodeURIComponent(tag.tagId)}`} />
        </li>
      ))}
    </ul>
  );
}
