"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">crispin-lab</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="login-email">이메일</Label>
            <Input
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
          <div className="grid gap-2">
            <Label htmlFor="login-password">비밀번호</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isPending}
            />
          </div>
        </CardContent>
        <CardFooter className="grid gap-3">
          <Button type="submit" size="lg" disabled={isPending} aria-busy={isPending}>
            {isPending ? <Loader2Icon className="animate-spin" /> : null}
            로그인
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            계정이 없으신가요?{" "}
            <Link href={signupHref} className="text-foreground font-medium hover:underline">
              회원가입 →
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
