import { FileTextIcon, UsersIcon } from "lucide-react";

import { FormattedTime } from "@/components/common/FormattedTime";
import { VisibilityBadge } from "@/components/page/VisibilityBadge";
import { RoleBadge } from "@/components/space/RoleBadge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SpaceSummary } from "@/lib/api/types";
import { spaceDisplayName } from "@/lib/space/displayName";
import { cn } from "@/lib/utils";

type Props = {
  space: SpaceSummary;
  className?: string;
};

export function SpaceCard({ space, className }: Props) {
  const description = space.description.trim();
  const name = spaceDisplayName(space);
  // PUBLIC 은 베이스 ring 색을 violet 으로 올려 공개 콘텐츠를 시각적으로 우선시.
  // INTERNAL 은 베이스 ring (ring-foreground/10) 유지. Card primitive 가 ring 기반이라 border 가 아닌 ring color 로 분기.
  const visibilityRing = space.visibility === "PUBLIC" ? "ring-accent/30" : null;

  return (
    <Card
      className={cn(
        "hover:shadow-accent-glow h-full min-h-44 transition-shadow duration-200 ease-out",
        visibilityRing,
        className,
      )}
    >
      <CardHeader>
        <CardTitle className={cn(name.isFallback && "italic")}>{name.text}</CardTitle>
        {space.unreadCount > 0 && (
          <CardAction>
            <UnreadBadge count={space.unreadCount} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {description !== "" && (
          <p className="text-muted-foreground line-clamp-1 text-sm">{description}</p>
        )}
        <LatestPageRow latestPage={space.latestPage} />
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
          <VisibilityBadge visibility={space.visibility} />
          {space.myRole != null && <RoleBadge role={space.myRole} />}
          <span
            className="inline-flex items-center gap-1"
            aria-label={`페이지 수: ${space.pageCount}`}
          >
            <FileTextIcon className="size-3" />
            {space.pageCount}
          </span>
          <span
            className="inline-flex items-center gap-1"
            aria-label={`멤버 수: ${space.memberCount}`}
          >
            <UsersIcon className="size-3" />
            {space.memberCount}
          </span>
          <span className="ml-auto">
            최근 활동 <FormattedTime iso={space.lastActivityAt} />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function UnreadBadge({ count }: { count: number }) {
  const display = count > 99 ? "99+" : String(count);
  return (
    <span
      className="bg-accent/10 border-accent/40 text-accent inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
      aria-label={`새 소식 ${count}개`}
    >
      새 소식 {display}
    </span>
  );
}

// 스키마 description 은 null 을 허용하지만 openapi-typescript 는 optional 만 표기 — loose equality 로 둘 다 흡수.
function LatestPageRow({ latestPage }: { latestPage: SpaceSummary["latestPage"] }) {
  if (latestPage == null) {
    return <p className="text-muted-foreground text-xs italic">아직 페이지 없음</p>;
  }
  return (
    <p className="text-muted-foreground flex items-baseline gap-2 text-xs">
      <span className="shrink-0">최근 편집</span>
      <span className="text-foreground truncate">{latestPage.title}</span>
      <FormattedTime iso={latestPage.updatedAt} className="ml-auto shrink-0" />
    </p>
  );
}
