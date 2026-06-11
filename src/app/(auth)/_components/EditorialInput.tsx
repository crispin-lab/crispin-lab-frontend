import { type ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function EditorialInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn(
        "h-11 rounded-none border-x-0 border-t-0 border-b bg-transparent px-0 text-base shadow-none transition-colors",
        "focus-visible:border-accent focus-visible:ring-0",
        // Input base 의 aria-invalid ring-3 을 끄고 border-b 색만 destructive — underline-only 의도 유지.
        "aria-invalid:border-destructive aria-invalid:ring-0",
        className,
      )}
      {...props}
    />
  );
}
