"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, EyeOffIcon } from "lucide-react";

import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  VISIBILITY_VALUES,
  type Visibility,
  buildCascadeBlockedReason,
  isVisibility,
  isVisibilityBlockedByCascade,
  visibilityDescription,
  visibilityLabel,
} from "@/lib/page/visibility";
import { cn } from "@/lib/utils";

type Props = {
  value: Visibility;
  onValueChange: (next: Visibility) => void;
  spaceVisibility?: Visibility | null;
  disabled?: boolean;
  className?: string;
  id?: string;
};

export function VisibilitySelect({
  value,
  onValueChange,
  spaceVisibility,
  disabled,
  className,
  id,
}: Props) {
  function handleChange(next: string | null) {
    if (typeof next === "string" && isVisibility(next)) onValueChange(next);
  }

  const blockedReason = spaceVisibility != null ? buildCascadeBlockedReason(spaceVisibility) : null;

  return (
    <Select value={value} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger id={id} aria-label="공개 범위" className={cn("min-w-28", className)}>
        <SelectValue>{visibilityLabel(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <TooltipProvider delay={0}>
          {VISIBILITY_VALUES.map((option) => {
            const isBlocked =
              spaceVisibility != null && isVisibilityBlockedByCascade(option, spaceVisibility);
            const reasonId = isBlocked ? `visibility-cascade-blocked-${option}` : undefined;
            return (
              <SelectPrimitive.Item
                key={option}
                value={option}
                disabled={isBlocked}
                aria-describedby={reasonId}
                className="focus:bg-muted focus:text-foreground relative flex w-full cursor-default items-start gap-1.5 rounded-md py-2 pr-8 pl-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50"
              >
                <div className="flex flex-1 flex-col gap-0.5">
                  <SelectPrimitive.ItemText className="whitespace-nowrap">
                    {visibilityLabel(option)}
                  </SelectPrimitive.ItemText>
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground text-xs whitespace-nowrap"
                  >
                    {visibilityDescription(option)}
                  </span>
                </div>
                {isBlocked && blockedReason != null && (
                  <>
                    <Tooltip>
                      {/* item 의 pointer-events-none 을 inner trigger 만 예외로 풀어 호버 가능하게.
                          listbox option ARIA 모델 보호 — trigger 는 span + non-focusable + AT 숨김, AT 사유는 item 의 aria-describedby 로 전달. */}
                      <TooltipTrigger
                        render={<span />}
                        tabIndex={-1}
                        aria-hidden="true"
                        className="text-muted-foreground pointer-events-auto inline-flex items-center"
                      >
                        <EyeOffIcon className="size-4" />
                      </TooltipTrigger>
                      <TooltipContent>{blockedReason}</TooltipContent>
                    </Tooltip>
                    <span id={reasonId} className="sr-only">
                      {blockedReason}
                    </span>
                  </>
                )}
                <SelectPrimitive.ItemIndicator
                  render={
                    <span className="pointer-events-none absolute top-2.5 right-2 flex size-4 items-center justify-center" />
                  }
                >
                  <CheckIcon className="pointer-events-none size-4" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            );
          })}
        </TooltipProvider>
      </SelectContent>
    </Select>
  );
}
