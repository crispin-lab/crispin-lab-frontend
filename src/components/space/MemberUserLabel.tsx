import { UserIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  handle: string;
  className?: string;
};

// LAB-158 이후 SpaceMember 응답에 handle 이 포함된다. 사용자 조회 miss 시 BE 가 빈 문자열을 실어 오므로
// (ui.md "도메인 fallback 라벨") 빈 문자열은 이탤릭 "삭제된 사용자" 로 표기, 그 외에는 `@{handle}`.
export function MemberUserLabel({ handle, className }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <UserIcon className="text-muted-foreground size-3.5" aria-hidden="true" />
      {handle === "" ? (
        <span className="italic">삭제된 사용자</span>
      ) : (
        <span className="text-accent-secondary">@{handle}</span>
      )}
    </span>
  );
}

// 대상 사용자를 한 문자열로 인지시켜야 하는 경계 (dialog description, aria-label 등) 에서 사용.
// 빈 handle 은 "삭제된 사용자" 문구로 대체.
export function memberDisplayHandle(handle: string): string {
  return handle === "" ? "삭제된 사용자" : `@${handle}`;
}
