import Link from "next/link";

import { cn } from "@/lib/utils";

type Props = {
  isAuthenticated: boolean;
  className?: string;
};

export function PublicAppBar({ isAuthenticated, className }: Props) {
  return (
    <header
      className={cn(
        "border-border bg-background sticky top-0 z-10 border-b",
        "flex h-12 items-center gap-4 px-6",
        className,
      )}
    >
      <Link href="/" className="text-sm font-semibold tracking-tight">
        crispin-lab
      </Link>
      <div className="flex-1">
        <input
          type="search"
          aria-label="검색 (준비 중)"
          placeholder="검색 (준비 중)"
          disabled
          className="border-input bg-muted/40 placeholder:text-muted-foreground text-muted-foreground h-8 w-full max-w-md cursor-not-allowed rounded-md border px-3 text-sm outline-none disabled:opacity-100"
        />
      </div>
      {isAuthenticated ? (
        <Link href="/spaces" className="text-muted-foreground text-sm hover:underline">
          내 스페이스 →
        </Link>
      ) : (
        <Link href="/login" className="text-muted-foreground text-sm hover:underline">
          로그인 →
        </Link>
      )}
    </header>
  );
}
