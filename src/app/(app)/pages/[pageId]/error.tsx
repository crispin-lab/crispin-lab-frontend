"use client";

import { Button } from "@/components/ui/button";

export default function PageErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error;
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-start gap-6 px-6 py-20">
      <p className="text-muted-foreground text-xs tracking-wider uppercase">오류</p>
      <h1 className="bg-gradient-to-r from-(--heading-gradient-start) to-(--heading-gradient-end) bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
        페이지를 불러오지 못했습니다.
      </h1>
      <p className="text-muted-foreground leading-7">잠시 후 다시 시도해 주세요.</p>
      <Button type="button" variant="outline" onClick={reset}>
        다시 시도
      </Button>
    </main>
  );
}
