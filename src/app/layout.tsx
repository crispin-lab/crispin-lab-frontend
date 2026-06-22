import type { Metadata } from "next";

import { cn } from "@/lib/utils";

import { geistMono, geistSans } from "./_fonts";
import { Providers } from "./providers";

import "./globals.css";
// TipTap math (KaTeX) 가 inline / block math 노드 렌더 시 .katex 클래스에 의존 — root layout 한 곳에서 한 번만 로드해 SSR 단계의 link tag 로 박힌다.
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: "crispin-lab",
  description: "crispin-lab — 개인 위키",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 번역 확장 / next-themes 가 root attribute 를 손대는 false-positive 만 무시 (<html> 한 단계).
    <html
      lang="ko"
      className={cn(geistSans.variable, geistMono.variable, "h-full antialiased")}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
