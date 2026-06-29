"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Suspense, useEffect, useState } from "react";

import { SearchInput } from "@/components/SearchInput";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/useAuth";
import { useSearchSubmit } from "@/hooks/useSearchSubmit";
import { loginRedirectUrl } from "@/lib/auth/redirect";
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
          "text-accent text-sm font-semibold tracking-tight transition-colors duration-150 ease-out",
          isHomeActive && "font-bold underline decoration-2 underline-offset-4",
        )}
      >
        crispin-lab
      </Link>
      {variant === "full" ? (
        <Suspense fallback={<div aria-hidden className="flex-1" />}>
          <HeaderSearchSlot isActive={isSearchActive} />
        </Suspense>
      ) : (
        <div aria-hidden className="flex-1" />
      )}
      <ThemeToggle />
      <Suspense fallback={<div aria-hidden className="h-8 w-20" />}>
        <AccountSlot pathname={pathname} />
      </Suspense>
    </header>
  );
}

function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- mount 감지 1회 flip (next-themes 권장 idiom).
  useEffect(() => setMounted(true), []);
  const { resolvedTheme, setTheme } = useTheme();

  // mount 전엔 같은 자리를 채우는 placeholder — Sun/Moon 분기가 SSR / 첫 client 렌더에서 hydration mismatch 를 일으키지 않게.
  if (!mounted) return <div aria-hidden className="size-7" />;

  const isDark = resolvedTheme !== "light";
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}

function HeaderSearchSlot({ isActive }: { isActive: boolean }) {
  // key remount 로 URL 변경 시 initialValue 를 새로 흘림 — props→state useEffect 동기화 회피.
  const urlQuery = useSearchParams().get("query") ?? "";
  return <HeaderSearchForm key={urlQuery} initialValue={urlQuery} isActive={isActive} />;
}

function HeaderSearchForm({ initialValue, isActive }: { initialValue: string; isActive: boolean }) {
  const submitSearch = useSearchSubmit();
  const [value, setValue] = useState(initialValue);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitSearch(value);
  }

  return (
    <form className="flex-1" role="search" onSubmit={handleSubmit}>
      <SearchInput
        name="query"
        aria-label="검색"
        placeholder="검색"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className={cn("max-w-md", isActive && "border-accent")}
      />
    </form>
  );
}

function AccountSlot({ pathname }: { pathname: string }) {
  const { data: me, isPending, isError } = useMe();
  const searchParams = useSearchParams();

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
      <Link
        href={loginHrefFor(pathname, searchParams)}
        className="text-muted-foreground text-sm hover:underline"
      >
        로그인 →
      </Link>
    );
  }

  return <AccountMenu me={me} />;
}

function loginHrefFor(pathname: string, searchParams: URLSearchParams): string {
  if (isAuthSelfPath(pathname)) {
    // /signup?redirect=/pages/p_1 처럼 auth 자기 자신에서도 user 의 원래 복귀 대상은 살린다 — SignupForm footer link 의 carry 규약과 정합.
    const existing = searchParams.get("redirect");
    return existing ? loginRedirectUrl(existing) : "/login";
  }
  const search = searchParams.toString();
  const target = search === "" ? pathname : `${pathname}?${search}`;
  return loginRedirectUrl(target);
}

function isAuthSelfPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/")
  );
}
