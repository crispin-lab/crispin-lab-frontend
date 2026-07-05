import { CircleHelpIcon, CrownIcon, EyeIcon, UserIcon } from "lucide-react";

import type { SpaceMemberRole } from "@/lib/api/types";
import { isSpaceMemberRole, spaceMemberRoleLabel } from "@/lib/space/memberRole";
import { cn } from "@/lib/utils";

type Props = {
  role: string;
  className?: string;
};

const ICON_MAP: Record<SpaceMemberRole, React.ComponentType<{ className?: string }>> = {
  OWNER: CrownIcon,
  MEMBER: UserIcon,
  VIEWER: EyeIcon,
};

export function RoleBadge({ role, className }: Props) {
  const known = isSpaceMemberRole(role);
  const Icon = known ? ICON_MAP[role] : CircleHelpIcon;
  const label = known ? spaceMemberRoleLabel(role) : role;
  return (
    <span
      className={cn(
        "border-border text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
        className,
      )}
      aria-label={`역할: ${label}`}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}
