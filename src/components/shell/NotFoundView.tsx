import Link from "next/link";

import { Button } from "@/components/ui/button";

// `(app)/not-found.tsx` 와 root `not-found.tsx` 의 공통 본문. 권한 부재와 미존재를 한 화면으로 묶는 정책은 `auth.md` "403 / 404" 참조.
export function NotFoundView() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-start gap-6 px-6 py-20">
      <p className="text-muted-foreground text-xs tracking-wider uppercase">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">이 페이지를 찾을 수 없습니다.</h1>
      <p className="text-muted-foreground leading-7">
        주소가 바뀌었거나, 더 이상 공개되지 않는 페이지일 수 있습니다.
      </p>
      <Button variant="secondary" nativeButton={false} render={<Link href="/">홈으로</Link>} />
    </main>
  );
}
