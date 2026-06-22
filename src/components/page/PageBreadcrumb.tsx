import { ChevronRight } from "lucide-react";
import Link from "next/link";

import type { Page, PageSummary, Space } from "@/lib/api/types";
import { spaceDisplayName } from "@/lib/space/displayName";
import { cn } from "@/lib/utils";

// 두 mode 의 invariant 를 TS 가 강제하도록 discriminated union — 상세 / 생성 동시 채움이 컴파일 단에서 차단된다.
type DetailModeProps = {
  mode: "detail";
  ancestors: Page["ancestors"];
};

type CreateModeProps = {
  mode: "create";
  parent?: Pick<PageSummary, "pageId" | "title">;
};

type CommonProps = {
  space: Pick<Space, "spaceId" | "name">;
  currentTitle: string;
  className?: string;
};

type Props = CommonProps & (DetailModeProps | CreateModeProps);

function middleSegmentsFor(props: Props): Array<{ pageId: string; title: string }> {
  if (props.mode === "detail") return props.ancestors;
  if (props.parent === undefined) return [];
  return [{ pageId: props.parent.pageId, title: props.parent.title }];
}

export function PageBreadcrumb(props: Props) {
  const { space, currentTitle, className } = props;

  // 상세 mode 의 root 페이지 (조상 없음) 는 스페이스 chip 만으로 충분하므로 breadcrumb 자체를 숨긴다.
  // 생성 mode 는 *지금 어디서 만드는지* 가 핵심이라 항상 노출.
  if (props.mode === "detail" && props.ancestors.length === 0) return null;

  const name = spaceDisplayName(space);
  const middleSegments = middleSegmentsFor(props);

  return (
    <nav
      aria-label="현재 페이지 경로"
      className={cn(
        "text-muted-foreground flex flex-wrap items-center gap-x-1 gap-y-1 text-xs",
        className,
      )}
    >
      <Link
        href={`/spaces/${encodeURIComponent(space.spaceId)}`}
        className={cn(
          "hover:text-foreground underline-offset-2 hover:underline",
          name.isFallback && "italic",
        )}
      >
        {name.text}
      </Link>
      {middleSegments.map((segment) => (
        <span key={segment.pageId} className="flex items-center gap-x-1">
          <ChevronRight className="size-3" aria-hidden />
          <Link
            href={`/pages/${encodeURIComponent(segment.pageId)}`}
            className="hover:text-foreground underline-offset-2 hover:underline"
          >
            {segment.title}
          </Link>
        </span>
      ))}
      <span className="flex items-center gap-x-1">
        <ChevronRight className="size-3" aria-hidden />
        <span aria-current="page" className="text-foreground/80">
          {currentTitle}
        </span>
      </span>
    </nav>
  );
}
