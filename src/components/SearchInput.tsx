import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function SearchInput({ className, ...rest }: Props) {
  return (
    <input
      {...rest}
      type="search"
      className={cn(
        "bg-muted/40 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50",
        "border-input h-8 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-3",
        className,
      )}
    />
  );
}
