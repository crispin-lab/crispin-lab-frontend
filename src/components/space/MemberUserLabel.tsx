import { UserIcon } from "lucide-react";

import { formatUserHandle, UserHandleLabel } from "@/components/UserHandleLabel";
import { cn } from "@/lib/utils";

type Props = {
  handle: string;
  className?: string;
};

export function MemberUserLabel({ handle, className }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <UserIcon className="text-muted-foreground size-3.5" aria-hidden />
      <UserHandleLabel handle={handle} />
    </span>
  );
}

export const memberDisplayHandle = formatUserHandle;
