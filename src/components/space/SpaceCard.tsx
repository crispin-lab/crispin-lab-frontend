import { VisibilityBadge } from "@/components/page/VisibilityBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SpaceSummary } from "@/lib/api/types";
import { formatUpdatedAtKR } from "@/lib/format/date";
import { cn } from "@/lib/utils";

type Props = {
  space: SpaceSummary;
  className?: string;
};

export function SpaceCard({ space, className }: Props) {
  const description = space.description.trim();
  const updatedAtLabel = formatUpdatedAtKR(space.updatedAt);
  // PUBLIC 은 시각적 우선 — subtle violet border 로 공개 콘텐츠를 노출.
  // INTERNAL 은 조용히 — neutral border 유지.
  const visibilityBorder = space.visibility === "PUBLIC" ? "border-accent/30" : "border-border";

  return (
    <Card
      className={cn(
        "hover:shadow-accent-glow h-full transition-shadow duration-200 ease-out",
        visibilityBorder,
        className,
      )}
    >
      <CardHeader>
        <CardTitle>{space.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {description !== "" && (
          <p className="text-muted-foreground line-clamp-1 text-sm">{description}</p>
        )}
        <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
          <VisibilityBadge visibility={space.visibility} />
          <time dateTime={space.updatedAt} aria-label={`마지막 수정 ${updatedAtLabel}`}>
            수정 {updatedAtLabel}
          </time>
        </div>
      </CardContent>
    </Card>
  );
}
