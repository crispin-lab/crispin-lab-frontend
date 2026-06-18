import { CircleHelpIcon, GlobeIcon, LockIcon, PencilLineIcon, UsersIcon } from "lucide-react";

import { type Visibility, isVisibility, visibilityLabel } from "@/lib/page/visibility";
import { cn } from "@/lib/utils";

type Props = {
  visibility: string;
  className?: string;
};

const ICON_MAP: Record<Visibility, React.ComponentType<{ className?: string }>> = {
  DRAFT: PencilLineIcon,
  INTERNAL: LockIcon,
  MEMBER: UsersIcon,
  PUBLIC: GlobeIcon,
};

// PUBLIC 만 accent — MEMBER cyan 은 메타 줄 author handle 과 한 포인트 한도 충돌 (design.md).
const ICON_COLOR_CLASS: Record<Visibility, string> = {
  DRAFT: "text-muted-foreground",
  INTERNAL: "text-muted-foreground",
  MEMBER: "text-muted-foreground",
  PUBLIC: "text-accent",
};

export function VisibilityBadge({ visibility, className }: Props) {
  const known = isVisibility(visibility);
  const Icon = known ? ICON_MAP[visibility] : CircleHelpIcon;
  const label = known ? visibilityLabel(visibility) : visibility;
  const iconColor = known ? ICON_COLOR_CLASS[visibility] : "text-muted-foreground";
  return (
    <span
      className={cn(
        "border-border text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
        className,
      )}
      aria-label={`공개 범위: ${label}`}
    >
      <Icon className={cn("size-3", iconColor)} />
      {label}
    </span>
  );
}
