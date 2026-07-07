"use client";

import { ChevronDownIcon, GlobeIcon, LockIcon, PencilLineIcon, UsersIcon } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type Visibility, visibilityDescription, visibilityLabel } from "@/lib/page/visibility";
import type { SpaceVisibility } from "@/lib/space/visibility";
import { cn } from "@/lib/utils";

import { VisibilitySelect } from "./VisibilitySelect";

// 아이콘·색 매핑은 VisibilityBadge 와 짝. 셋 변경 시 두 곳 동기.
const ICON_MAP: Record<Visibility, React.ComponentType<{ className?: string }>> = {
  DRAFT: PencilLineIcon,
  INTERNAL: LockIcon,
  MEMBER: UsersIcon,
  PUBLIC: GlobeIcon,
};

const ICON_COLOR_CLASS: Record<Visibility, string> = {
  DRAFT: "text-muted-foreground",
  INTERNAL: "text-muted-foreground",
  MEMBER: "text-muted-foreground",
  PUBLIC: "text-accent",
};

type Props = {
  value: Visibility;
  onValueChange: (next: Visibility) => void;
  spaceVisibility?: SpaceVisibility | null;
  disabled?: boolean;
  className?: string;
};

export function VisibilitySelectPopover({
  value,
  onValueChange,
  spaceVisibility,
  disabled,
  className,
}: Props) {
  const Icon = ICON_MAP[value];
  const iconColor = ICON_COLOR_CLASS[value];
  const label = visibilityLabel(value);

  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        aria-label={`공개 범위 변경 (현재 ${label})`}
        className={cn(
          "border-border text-muted-foreground bg-background hover:bg-muted/50 focus-visible:ring-ring/50 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <Icon aria-hidden className={cn("size-3", iconColor)} />
        <span>{label}</span>
        <ChevronDownIcon aria-hidden className="text-muted-foreground size-3" />
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-64 space-y-2 p-3">
        <p className="text-muted-foreground text-xs uppercase">공개 범위</p>
        <VisibilitySelect
          value={value}
          onValueChange={onValueChange}
          spaceVisibility={spaceVisibility}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-muted-foreground text-xs">{visibilityDescription(value)}</p>
      </PopoverContent>
    </Popover>
  );
}
