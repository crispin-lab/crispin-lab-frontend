// SSR prefetch 의 `allowAnonymousFallback: true` 는 BE 가 anonymous 호출에 대해 visibility scope 안의 태그만 반환한다는 계약에
// 정합 (auth.md "옵셔널 인증 endpoint"). BE 계약이 깨지면 PRIVATE 태그가 PUBLIC 페이지 reading 시 누설된다 — 본 가정이 깨졌다는
// 신호가 보이면 본 파일과 reading 화면의 prefetch (`app/(app)/pages/[pageId]/page.tsx`) 를 동시에 재검토.

import type { PageId } from "./ids";
import { buildPageTagListQuery, type PageTagListParams } from "./pageTag";
import { apiFetchServer, type ApiServerOptions } from "./server";
import type { PageTagListResult } from "./types";

export function fetchPageTagListServer(
  pageId: PageId,
  params: PageTagListParams = {},
  options?: ApiServerOptions,
): Promise<PageTagListResult> {
  const search = buildPageTagListQuery(params);
  const base = `/v1/pages/${encodeURIComponent(pageId)}/tags`;
  const path = search === "" ? base : `${base}?${search}`;
  return apiFetchServer<PageTagListResult>(path, options);
}
