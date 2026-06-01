"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { AuthFooterNav } from "@/app/(auth)/_components/AuthFooterNav";
import { CtaLink } from "@/app/(auth)/_components/CtaLink";
import { EditorialInput } from "@/app/(auth)/_components/EditorialInput";
import { EDITORIAL_LABEL_CLASS } from "@/app/(auth)/_lib/labelClass";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
    <div className="space-y-12">
      <div className="space-y-6">
        <p className="text-muted-foreground text-xs tracking-[0.2em] uppercase">crispin-lab</p>
        <hr className="border-border" />
      </div>

      <h1 className="text-3xl font-semibold tracking-tight">회원가입</h1>

      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className={EDITORIAL_LABEL_CLASS}>이메일</FormLabel>
                <FormControl>
                  <EditorialInput
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
              <FormItem className="space-y-2">
                <FormLabel className={EDITORIAL_LABEL_CLASS}>사용자 이름</FormLabel>
                <FormControl>
                  <EditorialInput
                    type="text"
                    autoComplete="username"
                    placeholder="alice_lab"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  영문 소문자·숫자·밑줄 3~30자. 공개 페이지에 표시됩니다.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className={EDITORIAL_LABEL_CLASS}>비밀번호</FormLabel>
                <FormControl>
                  <EditorialInput
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

          <div className="pt-2">
            <CtaLink type="submit" isPending={isPending}>
              회원가입
            </CtaLink>
          </div>
        </form>
      </Form>

      <AuthFooterNav
        links={[
          { href: loginHref, label: "로그인" },
          { href: "/", label: "위키로 돌아가기" },
        ]}
      />
    </div>
  );
}
