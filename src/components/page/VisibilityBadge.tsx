import { CircleHelpIcon } from "lucide-react";

import {
  VISIBILITY_ICON,
  VISIBILITY_ICON_COLOR,
  isVisibility,
  visibilityLabel,
} from "@/lib/page/visibility";
import { cn } from "@/lib/utils";

type Props = {
  visibility: string;
  className?: string;
};

export function VisibilityBadge({ visibility, className }: Props) {
  const known = isVisibility(visibility);
  const Icon = known ? VISIBILITY_ICON[visibility] : CircleHelpIcon;
  const label = known ? visibilityLabel(visibility) : visibility;
  const iconColor = known ? VISIBILITY_ICON_COLOR[visibility] : "text-muted-foreground";
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
