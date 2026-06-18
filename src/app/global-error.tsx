"use client";

import { PageHeading } from "@/components/PageHeading";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { geistMono, geistSans } from "./_fonts";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    // 번역 확장 / next-themes 가 root attribute 를 손대는 false-positive 만 무시 (<html> 한 단계).
    <html
      lang="ko"
      className={cn(geistSans.variable, geistMono.variable, "h-full antialiased")}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <main className="mx-auto flex w-full max-w-2xl flex-col items-start gap-6 px-6 py-20">
          <p className="text-muted-foreground text-xs tracking-wider uppercase">시스템 오류</p>
          <PageHeading>앱을 불러오지 못했습니다.</PageHeading>
          <p className="text-muted-foreground leading-8">잠시 후 다시 시도해 주세요.</p>
          {error.digest && (
            <p className="text-muted-foreground font-mono text-xs">{error.digest}</p>
          )}
          <Button type="button" variant="outline" onClick={reset}>
            다시 시도
          </Button>
        </main>
      </body>
    </html>
  );
}
