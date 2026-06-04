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
    <main className="mx-auto max-w-2xl px-6 py-20 text-center">
      <h1 className="text-2xl font-semibold">페이지를 불러오지 못했습니다.</h1>
      <p className="text-muted-foreground mt-3 text-sm">잠시 후 다시 시도해 주세요.</p>
      <Button type="button" variant="outline" onClick={reset} className="mt-6">
        다시 시도
      </Button>
    </main>
  );
}
