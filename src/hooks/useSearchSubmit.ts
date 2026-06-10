"use client";

import { useRouter } from "next/navigation";

import { buildSearchUrl, parseSearchParams } from "@/lib/search/searchParams";

export function useSearchSubmit(): (rawQuery: string) => void {
  const router = useRouter();
  return (rawQuery: string) => {
    const query = rawQuery.trim();
    if (query === "") return;
    // callback 은 submit 이벤트로만 발화 — window 가 항상 있고, useSearchParams 의 Suspense 도 우회.
    const current = parseSearchParams(new URLSearchParams(window.location.search));
    router.push(buildSearchUrl(current, { query }));
  };
}
