import { ArrowRightIcon, Loader2Icon } from "lucide-react";
import { type ComponentProps } from "react";

import { cn } from "@/lib/utils";

// shadcn Button 의 link variant 는 primary 색 + underline 이라 본 디자인 (accent + arrow icon + hover slide) 과 안 맞아 raw <button>.
type Props = ComponentProps<"button"> & { isPending?: boolean };

export function CtaLink({ className, isPending, children, disabled, ...props }: Props) {
  return (
    <button
      className={cn(
        "group text-accent hover:text-accent/80 inline-flex items-center gap-2 text-base font-medium transition-colors outline-none",
        "focus-visible:underline focus-visible:underline-offset-4",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      aria-busy={isPending}
      disabled={isPending || disabled}
      {...props}
    >
      {isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
      {children}
      {isPending ? null : (
        <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
      )}
    </button>
  );
}
