import { type ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function EditorialInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn(
        "h-11 rounded-none border-x-0 border-t-0 border-b bg-transparent px-0 text-base shadow-none transition-colors",
        "focus-visible:border-accent focus-visible:ring-0",
        // underline-only 의도 보존 — shadcn base 의 aria-invalid 사각 ring 을 끄고 border-b 색만 destructive 로.
        "aria-invalid:border-destructive aria-invalid:ring-0 dark:aria-invalid:ring-0",
        "dark:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}
