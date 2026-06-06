import { CircleHelpIcon, GlobeIcon, LockIcon, PencilLineIcon } from "lucide-react";

import { type Visibility, isVisibility, visibilityLabel } from "@/lib/page/visibility";
import { cn } from "@/lib/utils";

type Props = {
  visibility: string;
  className?: string;
};

const ICON_MAP: Record<Visibility, React.ComponentType<{ className?: string }>> = {
  DRAFT: PencilLineIcon,
  INTERNAL: LockIcon,
  PUBLIC: GlobeIcon,
};

export function VisibilityBadge({ visibility, className }: Props) {
  const known = isVisibility(visibility);
  const Icon = known ? ICON_MAP[visibility] : CircleHelpIcon;
  const label = known ? visibilityLabel(visibility) : visibility;
  return (
    <span
      className={cn(
        "border-border text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
        className,
      )}
      aria-label={`공개 범위: ${label}`}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}
