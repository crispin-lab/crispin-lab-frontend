import { FormattedTime } from "@/components/common/FormattedTime";
import { UserHandleLabel } from "@/components/UserHandleLabel";
import type { SpaceAuditEntry } from "@/lib/api/types";
import { formatAuditChangeLines, isKnownAuditAction } from "@/lib/space/auditChangeSummary";

import { AuditActionChip } from "./AuditActionChip";

type Props = {
  entry: SpaceAuditEntry;
};

export function AuditTimelineItem({ entry }: Props) {
  const lines = isKnownAuditAction(entry.action)
    ? formatAuditChangeLines(entry.action, entry.changeSummary)
    : ["변경 내용을 표시할 수 없습니다."];

  return (
    <li className="border-border/60 relative border-l pl-6">
      <span
        aria-hidden
        className="bg-muted-foreground/40 absolute top-2 -left-[5px] size-2.5 rounded-full"
      />
      <div className="space-y-2 pb-6">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <FormattedTime iso={entry.createdAt} variant="datetime" />
          <AuditActionChip action={entry.action} />
          <UserHandleLabel handle={entry.actorHandle} />
        </div>
        <ul className="text-foreground space-y-1 text-sm leading-6">
          {lines.map((line, index) => (
            <li key={`${entry.id}-${index}`}>{line}</li>
          ))}
        </ul>
      </div>
    </li>
  );
}
