"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout } from "@/hooks/useAuth";
import type { Me } from "@/lib/api/types";

type Props = {
  me: Me;
};

export function AccountMenu({ me }: Props) {
  const { mutate: doLogout, isPending } = useLogout();
  const { resolvedTheme, setTheme } = useTheme();
  // `!== "light"` 로 두어 mount 전 undefined 도 dark 로 흡수 (=== "dark" 로 바꾸면 첫 렌더가 light 라벨로 깜빡인다).
  const isDark = resolvedTheme !== "light";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" aria-label="계정 메뉴">
            @{me.handle}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuLinkItem render={<Link href="/spaces">스페이스</Link>} />
        <DropdownMenuItem onClick={() => setTheme(isDark ? "light" : "dark")}>
          {isDark ? <SunIcon /> : <MoonIcon />}
          {isDark ? "라이트 모드" : "다크 모드"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isPending} onClick={() => doLogout()}>
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
