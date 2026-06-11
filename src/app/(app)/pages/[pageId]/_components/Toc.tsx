"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

import { useActiveHeading } from "./useActiveHeading";

export type TocItem = { id: string; level: 1 | 2 | 3; text: string };

type Props = {
  items: TocItem[];
};

export function Toc({ items }: Props) {
  const ids = items.map((item) => item.id);
  const activeId = useActiveHeading(ids);

  return (
    <aside className="hidden lg:block">
      <nav aria-label="목차" className="sticky top-20">
        <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
          목차
        </p>
        <ul className="space-y-1.5 text-sm">
          {items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <li key={item.id}>
                <Link
                  href={`#${item.id}`}
                  className={cn(
                    "block border-l-2 transition-colors duration-150 ease-out",
                    tocLinkPadding(item.level),
                    isActive
                      ? "border-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground border-transparent",
                  )}
                >
                  {item.text}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

function tocLinkPadding(level: 1 | 2 | 3): string {
  if (level === 1) return "pl-3";
  if (level === 2) return "pl-6";
  return "pl-9";
}
