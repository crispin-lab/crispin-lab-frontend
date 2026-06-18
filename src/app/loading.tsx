import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="로딩 중"
      className="mx-auto flex w-full max-w-2xl flex-col items-start gap-6 px-6 py-20"
    >
      <Skeleton aria-hidden="true" className="h-3 w-12" />
      <Skeleton aria-hidden="true" className="h-8 w-2/3" />
      <div aria-hidden="true" className="w-full space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </main>
  );
}
