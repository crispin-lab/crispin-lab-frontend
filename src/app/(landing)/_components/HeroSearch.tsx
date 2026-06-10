"use client";

import { SearchIcon } from "lucide-react";
import { useState } from "react";

import { useSearchSubmit } from "@/hooks/useSearchSubmit";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function HeroSearch({ className }: Props) {
  const submitSearch = useSearchSubmit();
  const [value, setValue] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitSearch(value);
  }

  return (
    <form className={cn("w-full", className)} role="search" onSubmit={handleSubmit}>
      <div className="relative">
        <SearchIcon
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
        />
        <input
          type="search"
          name="query"
          aria-label="검색"
          placeholder="키워드로 검색"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-14 w-full rounded-lg border pr-4 pl-12 text-base outline-none focus-visible:ring-3"
        />
      </div>
    </form>
  );
}
