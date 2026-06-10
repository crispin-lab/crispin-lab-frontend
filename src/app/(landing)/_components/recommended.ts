// RSC `(landing)/page.tsx` 와 Client `RecommendedPageList` 가 같은 query key 로 hydrate 매칭되도록
// "use client" 모듈에서 분리한 공유 상수.
import type { PageSearchParams } from "@/lib/api/page";

export const RECOMMENDED_PARAMS: PageSearchParams = { sort: "UPDATED_AT", size: 10 };
