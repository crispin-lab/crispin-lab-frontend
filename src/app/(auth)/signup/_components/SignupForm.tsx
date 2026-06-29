"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { AuthFooterNav } from "@/app/(auth)/_components/AuthFooterNav";
import { CtaLink } from "@/app/(auth)/_components/CtaLink";
import { EditorialInput } from "@/app/(auth)/_components/EditorialInput";
import { EDITORIAL_LABEL_CLASS } from "@/app/(auth)/_lib/labelClass";
import { PageHeading } from "@/components/PageHeading";
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
import { ApiError } from "@/lib/api/client";
import { loginRedirectUrl, safeRedirectTarget } from "@/lib/auth/redirect";
import { signupFormSchema, toSignupInput, type SignupFormInput } from "@/lib/schemas/auth";

const DUPLICATE_FIELDS = {
  EMAIL_DUPLICATED: "email",
  HANDLE_DUPLICATED: "handle",
} as const satisfies Record<string, "email" | "handle">;

type DuplicateCode = keyof typeof DUPLICATE_FIELDS;

function isDuplicateCode(code: string): code is DuplicateCode {
  return code in DUPLICATE_FIELDS;
}

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate, isPending } = useSignup();

  const form = useForm<SignupFormInput>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { email: "", handle: "", password: "", passwordConfirm: "" },
  });

  const rawRedirect = searchParams.get("redirect");
  const loginHref = rawRedirect ? loginRedirectUrl(rawRedirect) : "/login";

  function onSubmit(values: SignupFormInput) {
    form.clearErrors("root.duplicate");
    mutate(toSignupInput(values), {
      onSuccess: () => {
        router.push(safeRedirectTarget(rawRedirect));
      },
      onError: (error) => {
        if (!(error instanceof ApiError) || error.status !== 409) return;
        if (isDuplicateCode(error.code)) {
          form.setError(DUPLICATE_FIELDS[error.code], {
            type: "server",
            message: error.message,
          });
          return;
        }
        // 매핑되지 않은 409 — root error 로 user-visible fallback. backend 가 새 code 를 추가했을 때 inline 이 silent 가 되지 않도록.
        form.setError("root.duplicate", { type: "server", message: error.message });
      },
    });
  }

  const rootDuplicateMessage = form.formState.errors.root?.duplicate?.message;

  return (
    <div className="space-y-12">
      <div className="space-y-6">
        <p className="text-muted-foreground text-xs tracking-[0.2em] uppercase">crispin-lab</p>
        <hr className="border-border" />
      </div>

      <PageHeading>회원가입</PageHeading>

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
          <FormField
            control={form.control}
            name="passwordConfirm"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className={EDITORIAL_LABEL_CLASS}>비밀번호 확인</FormLabel>
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

          {rootDuplicateMessage && (
            <p role="alert" className="text-destructive text-sm">
              {rootDuplicateMessage}
            </p>
          )}

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
