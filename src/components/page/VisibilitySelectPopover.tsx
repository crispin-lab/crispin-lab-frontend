"use client";

import { ChevronDownIcon } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  VISIBILITY_ICON,
  VISIBILITY_ICON_COLOR,
  type Visibility,
  visibilityDescription,
  visibilityLabel,
} from "@/lib/page/visibility";
import type { SpaceVisibility } from "@/lib/space/visibility";
import { cn } from "@/lib/utils";

import { VisibilitySelect } from "./VisibilitySelect";

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
  const Icon = VISIBILITY_ICON[value];
  const iconColor = VISIBILITY_ICON_COLOR[value];
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
