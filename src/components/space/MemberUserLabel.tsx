import { UserIcon } from "lucide-react";

import { UserHandleLabel } from "@/components/UserHandleLabel";
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

// 대상 사용자를 한 문자열로 인지시켜야 하는 경계 (dialog description, aria-label 등) 에서 사용.
export function memberDisplayHandle(handle: string): string {
  return handle === "" ? "삭제된 사용자" : `@${handle}`;
}
