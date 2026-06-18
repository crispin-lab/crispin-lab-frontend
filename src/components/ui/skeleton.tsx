import { cn } from "@/lib/utils";

// shadcn 디폴트 `bg-accent` (violet) 는 `design.md` 의 accent 한도와 충돌 — 본 프로젝트는 `bg-muted` 로 유지.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted animate-pulse rounded", className)}
      {...props}
    />
  );
}

export { Skeleton };
