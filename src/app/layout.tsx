import type { Metadata } from "next";

import { cn } from "@/lib/utils";

import { geistMono, geistSans } from "./_fonts";
import { Providers } from "./providers";

import "./globals.css";

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
