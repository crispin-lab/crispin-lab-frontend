import { VisibilityBadge } from "@/components/page/VisibilityBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SpaceSummary } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Props = {
  space: SpaceSummary;
  className?: string;
};

// SSR/CSR 양쪽에서 같은 출력이 나오도록 fixed locale + options. `toLocaleDateString` 의 환경의존 회피.
const UPDATED_AT_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function SpaceCard({ space, className }: Props) {
  const description = (space.description ?? "").trim();
  const updatedAtLabel = UPDATED_AT_FORMAT.format(new Date(space.updatedAt));

  return (
    <Card className={cn("h-full", className)}>
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
