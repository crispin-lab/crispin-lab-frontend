"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { useMe } from "@/hooks/useAuth";
import { useSearchSubmit } from "@/hooks/useSearchSubmit";
import { cn } from "@/lib/utils";

import { AccountMenu } from "./AccountMenu";

type Variant = "full" | "thin";

type Props = {
  className?: string;
  variant?: Variant;
};

export function AppHeader({ className, variant = "full" }: Props) {
  const pathname = usePathname();
  const isHomeActive = pathname === "/";
  const isSearchActive = pathname === "/search";

  return (
    <header
      className={cn(
        "border-border bg-background sticky top-0 z-10 border-b",
        "flex h-12 items-center gap-4 px-6",
        className,
      )}
    >
      <Link
        href="/"
        aria-current={isHomeActive ? "page" : undefined}
        className={cn(
          "text-sm font-semibold tracking-tight transition-colors duration-150 ease-out",
          isHomeActive ? "text-accent" : "text-foreground hover:text-accent",
        )}
      >
        crispin-lab
      </Link>
      {variant === "full" ? (
        <Suspense fallback={<div aria-hidden className="flex-1" />}>
          <SearchInput isActive={isSearchActive} />
        </Suspense>
      ) : (
        <div aria-hidden className="flex-1" />
      )}
      <AccountSlot />
    </header>
  );
}

function SearchInput({ isActive }: { isActive: boolean }) {
  // key remount 로 URL 변경 시 initialValue 를 새로 흘림 — props→state useEffect 동기화 회피.
  const urlQuery = useSearchParams().get("query") ?? "";
  return <SearchInputInner key={urlQuery} initialValue={urlQuery} isActive={isActive} />;
}

function SearchInputInner({ initialValue, isActive }: { initialValue: string; isActive: boolean }) {
  const submitSearch = useSearchSubmit();
  const [value, setValue] = useState(initialValue);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitSearch(value);
  }

  return (
    <form className="flex-1" role="search" onSubmit={handleSubmit}>
      <input
        type="search"
        name="query"
        aria-label="검색"
        placeholder="검색"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className={cn(
          "bg-muted/40 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full max-w-md rounded-md border px-3 text-sm outline-none focus-visible:ring-3",
          isActive ? "border-accent" : "border-input",
        )}
      />
    </form>
  );
}

function AccountSlot() {
  const { data: me, isPending, isError } = useMe();

  // 첫 로드 동안 깜빡임 방지 + 5xx 일시 장애에서 "로그아웃된 것처럼 보이는" 회귀 방지를 같이 잡는다.
  // 트레이드오프: 백엔드 영구 5xx 시 비로그인 사용자가 로그인 link 도 못 보지만, 로그인 페이지는 BFF 의 다른 경로라
  // 직접 URL 로 진입 가능. 깜빡임이 더 흔한 경험이라 placeholder 쪽으로 기운다.
  if (isPending || isError) {
    return (
      <div
        aria-hidden
        data-testid="account-slot-placeholder"
        data-state={isError ? "error" : "loading"}
        className="h-8 w-20"
      />
    );
  }

  if (me == null) {
    return (
      <Link href="/login" className="text-muted-foreground text-sm hover:underline">
        로그인 →
      </Link>
    );
  }

  return <AccountMenu me={me} />;
}
