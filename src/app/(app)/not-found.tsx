import { NotFoundView } from "@/components/shell/NotFoundView";

// `(app)` 안에서 발생한 notFound() 가 root 의 not-found.tsx 로 떨어지지 않도록 자체 fallback 을 둔다 — `(app)/layout.tsx`
// 의 AppHeader 가 wrap 해 헤더 컨텍스트를 유지한다.
export default function AppNotFound() {
  return <NotFoundView />;
}
