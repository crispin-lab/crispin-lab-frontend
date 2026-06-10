"use client";

import { useRouter } from "next/navigation";

export function useSearchSubmit(): (rawQuery: string) => void {
  const router = useRouter();
  return (rawQuery: string) => {
    const query = rawQuery.trim();
    if (query === "") return;
    router.push(`/search?query=${encodeURIComponent(query)}`);
  };
}
