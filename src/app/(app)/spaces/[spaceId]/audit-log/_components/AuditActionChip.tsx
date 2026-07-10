import { CircleHelpIcon, PencilIcon, PlusCircleIcon, Trash2Icon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { SpaceAuditAction } from "@/lib/api/types";
import { isKnownAuditAction } from "@/lib/space/auditChangeSummary";
import { cn } from "@/lib/utils";

type Props = {
  action: string;
  className?: string;
};

const ACTION_LABEL: Record<SpaceAuditAction, string> = {
  REGISTERED: "등록",
  EDITED: "수정",
  DELETED: "삭제",
};

const ACTION_ICON: Record<SpaceAuditAction, LucideIcon> = {
  REGISTERED: PlusCircleIcon,
  EDITED: PencilIcon,
  DELETED: Trash2Icon,
};

// DELETED 만 destructive tone. REGISTERED / EDITED 는 muted.
const ACTION_TONE: Record<SpaceAuditAction, string> = {
  REGISTERED: "text-muted-foreground border-border",
  EDITED: "text-muted-foreground border-border",
  DELETED: "text-destructive border-destructive/40",
};

export function AuditActionChip({ action, className }: Props) {
  const known = isKnownAuditAction(action);
  const Icon = known ? ACTION_ICON[action] : CircleHelpIcon;
  const label = known ? ACTION_LABEL[action] : action;
  const tone = known ? ACTION_TONE[action] : "text-muted-foreground border-border";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
        tone,
        className,
      )}
      aria-label={`변경 유형: ${label}`}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  );
}
