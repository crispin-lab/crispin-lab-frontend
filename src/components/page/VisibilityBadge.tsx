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
  const knownVisibility = isVisibility(visibility);
  const Icon = knownVisibility ? ICON_MAP[visibility] : CircleHelpIcon;
  return (
    <span
      className={cn(
        "border-border text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
        className,
      )}
      aria-label={`공개 범위: ${knownVisibility ? visibilityLabel(visibility) : visibility}`}
    >
      <Icon className="size-3" />
      {knownVisibility ? visibilityLabel(visibility) : visibility}
    </span>
  );
}
