"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useSignup } from "@/hooks/useAuth";
import { safeRedirectTarget } from "@/lib/auth/redirect";
import { signupSchema, type SignupInput } from "@/lib/schemas/auth";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate, isPending } = useSignup();

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", handle: "", password: "" },
  });

  const rawRedirect = searchParams.get("redirect");
  const loginHref = rawRedirect ? `/login?redirect=${encodeURIComponent(rawRedirect)}` : "/login";

  function onSubmit(values: SignupInput) {
    mutate(values, {
      onSuccess: () => {
        router.push(safeRedirectTarget(rawRedirect));
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">crispin-lab</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="handle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>핸들</FormLabel>
                  <FormControl>
                    <Input type="text" autoComplete="username" disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="grid gap-3">
            <Button type="submit" size="lg" disabled={isPending} aria-busy={isPending}>
              {isPending ? <Loader2Icon className="animate-spin" /> : null}
              회원가입
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              이미 계정이 있나요?{" "}
              <Link href={loginHref} className="text-foreground font-medium hover:underline">
                로그인 →
              </Link>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
