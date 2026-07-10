import { FileTextIcon, UsersIcon } from "lucide-react";

import { FormattedTime } from "@/components/common/FormattedTime";
import { VisibilityBadge } from "@/components/page/VisibilityBadge";
import { RoleBadge } from "@/components/space/RoleBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SpaceSummary } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Props = {
  space: SpaceSummary;
  className?: string;
};

export function SpaceCard({ space, className }: Props) {
  const description = space.description.trim();
  // PUBLIC 은 베이스 ring 색을 violet 으로 올려 공개 콘텐츠를 시각적으로 우선시.
  // INTERNAL 은 베이스 ring (ring-foreground/10) 유지. Card primitive 가 ring 기반이라 border 가 아닌 ring color 로 분기.
  const visibilityRing = space.visibility === "PUBLIC" ? "ring-accent/30" : null;

  return (
    <Card
      className={cn(
        "hover:shadow-accent-glow h-full transition-shadow duration-200 ease-out",
        visibilityRing,
        className,
      )}
    >
      <CardHeader>
        <CardTitle>{space.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {description !== "" && (
          <p className="text-muted-foreground line-clamp-1 text-sm">{description}</p>
        )}
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
