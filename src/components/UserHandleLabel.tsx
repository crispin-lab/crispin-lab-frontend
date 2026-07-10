import { cn } from "@/lib/utils";

type Props = {
  handle: string;
  className?: string;
};

export function UserHandleLabel({ handle, className }: Props) {
  if (handle === "") {
    return <span className={cn("italic", className)}>삭제된 사용자</span>;
  }
  return <span className={cn("text-accent-secondary", className)}>@{handle}</span>;
}

// 문자열이 필요한 경계 (dialog description, aria-label 등) 에서 UserHandleLabel 과 동일한 규약으로 포맷.
export function formatUserHandle(handle: string): string {
  return handle === "" ? "삭제된 사용자" : `@${handle}`;
}
