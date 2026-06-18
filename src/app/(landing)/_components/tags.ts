import type { PopularTagsParams } from "@/lib/api/tag";

// RSC prefetch 와 client useQuery 가 같은 params 로 key 를 만들어 hydrate hit 률을 보장한다.
export const POPULAR_TAGS_PARAMS: PopularTagsParams = { size: 20 };
