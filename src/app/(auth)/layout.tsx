import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12">
      <div className="w-full max-w-sm">{children}</div>
      <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
        ← 위키로 돌아가기
      </Link>
    </main>
  );
}
