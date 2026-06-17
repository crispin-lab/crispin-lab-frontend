import { Library } from "lucide-react";
import Link from "next/link";

import type { Space } from "@/lib/api/types";
import { spaceDisplayName } from "@/lib/space/displayName";
import { cn } from "@/lib/utils";

type Props = {
  space: Pick<Space, "spaceId" | "name">;
  className?: string;
};

export function SpaceChip({ space, className }: Props) {
  const name = spaceDisplayName(space);
  return (
    <Link
      href={`/spaces/${encodeURIComponent(space.spaceId)}`}
      aria-label={`스페이스: ${name.text}`}
      className={cn(
        "bg-accent text-accent-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
        "hover:bg-accent/90 hover:shadow-accent-glow transition-shadow duration-200 ease-out",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        name.isFallback && "italic",
        className,
      )}
    >
      <Library className="size-3" aria-hidden />
      {name.text}
    </Link>
  );
}
