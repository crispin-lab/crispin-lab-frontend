import { PageHeading } from "@/components/PageHeading";
import { cn } from "@/lib/utils";

import { HeroSearch } from "./HeroSearch";

type Props = {
  className?: string;
};

export function HeroSection({ className }: Props) {
  return (
    <section className={cn("flex flex-col items-center gap-6 text-center", className)}>
      <div className="flex flex-col gap-2">
        <PageHeading className="sm:text-4xl">글이 모이는 곳</PageHeading>
        <p className="text-muted-foreground text-base">개인 위키 — 공개 메모와 정리</p>
      </div>
      <HeroSearch className="max-w-xl" />
    </section>
  );
}
