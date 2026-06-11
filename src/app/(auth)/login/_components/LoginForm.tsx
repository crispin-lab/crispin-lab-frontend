"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { AuthFooterNav } from "@/app/(auth)/_components/AuthFooterNav";
import { CtaLink } from "@/app/(auth)/_components/CtaLink";
import { EditorialInput } from "@/app/(auth)/_components/EditorialInput";
import { EDITORIAL_LABEL_CLASS } from "@/app/(auth)/_lib/labelClass";
import { PageHeading } from "@/components/PageHeading";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/useAuth";
import { safeRedirectTarget } from "@/lib/auth/redirect";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate, isPending } = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const rawRedirect = searchParams.get("redirect");
  const signupHref = rawRedirect
    ? `/signup?redirect=${encodeURIComponent(rawRedirect)}`
    : "/signup";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutate(
      { email, password },
      {
        onSuccess: () => {
          router.push(safeRedirectTarget(rawRedirect));
        },
      },
    );
  }

  return (
    <div className="space-y-12">
      <div className="space-y-6">
        <p className="text-muted-foreground text-xs tracking-[0.2em] uppercase">crispin-lab</p>
        <hr className="border-border" />
      </div>

      <PageHeading>로그인</PageHeading>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="login-email" className={EDITORIAL_LABEL_CLASS}>
            이메일
          </Label>
          <EditorialInput
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password" className={EDITORIAL_LABEL_CLASS}>
            비밀번호
          </Label>
          <EditorialInput
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isPending}
          />
        </div>

        <div className="pt-2">
          <CtaLink type="submit" isPending={isPending}>
            로그인
          </CtaLink>
        </div>
      </form>

      <AuthFooterNav
        links={[
          { href: signupHref, label: "회원가입" },
          { href: "/", label: "위키로 돌아가기" },
        ]}
      />
    </div>
  );
}
