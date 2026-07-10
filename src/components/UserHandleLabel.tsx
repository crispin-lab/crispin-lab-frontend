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
