import { FormattedTime } from "@/components/common/FormattedTime";
import { VisibilityBadge } from "@/components/page/VisibilityBadge";
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
      <CardContent className="flex flex-col gap-2">
        {description !== "" && (
          <p className="text-muted-foreground line-clamp-1 text-sm">{description}</p>
        )}
        <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
          <VisibilityBadge visibility={space.visibility} />
          <span>
            수정 <FormattedTime iso={space.updatedAt} />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
