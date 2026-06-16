"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout } from "@/hooks/useAuth";
import type { Me } from "@/lib/api/types";

type Props = {
  me: Me;
};

export function AccountMenu({ me }: Props) {
  const { mutate: doLogout, isPending } = useLogout();

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
        <DropdownMenuItem disabled={isPending} onClick={() => doLogout()}>
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
