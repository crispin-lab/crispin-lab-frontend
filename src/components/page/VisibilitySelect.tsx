import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon } from "lucide-react";

import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  VISIBILITY_VALUES,
  type Visibility,
  isVisibility,
  visibilityDescription,
  visibilityLabel,
} from "@/lib/page/visibility";
import { cn } from "@/lib/utils";

type Props = {
  value: Visibility;
  onValueChange: (next: Visibility) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
};

export function VisibilitySelect({ value, onValueChange, disabled, className, id }: Props) {
  function handleChange(next: string | null) {
    if (typeof next === "string" && isVisibility(next)) onValueChange(next);
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger id={id} aria-label="공개 범위" className={cn("min-w-28", className)}>
        <SelectValue>{visibilityLabel(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {VISIBILITY_VALUES.map((option) => (
          // SelectItem wrapper 는 children 을 ItemText 로 묶어 라벨 + 설명이 한 텍스트로 인덱싱된다.
          // 여기서는 라벨만 ItemText 로, 설명은 sibling 으로 분리해 typeahead 정합성을 유지.
          <SelectPrimitive.Item
            key={option}
            value={option}
            className="focus:bg-muted focus:text-foreground relative flex w-full cursor-default items-start gap-1.5 rounded-md py-2 pr-8 pl-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50"
          >
            <div className="flex flex-1 flex-col gap-0.5">
              <SelectPrimitive.ItemText className="whitespace-nowrap">
                {visibilityLabel(option)}
              </SelectPrimitive.ItemText>
              <span className="text-muted-foreground text-xs whitespace-nowrap">
                {visibilityDescription(option)}
              </span>
            </div>
            <SelectPrimitive.ItemIndicator
              render={
                <span className="pointer-events-none absolute top-2.5 right-2 flex size-4 items-center justify-center" />
              }
            >
              <CheckIcon className="pointer-events-none size-4" />
            </SelectPrimitive.ItemIndicator>
          </SelectPrimitive.Item>
        ))}
      </SelectContent>
    </Select>
  );
}
