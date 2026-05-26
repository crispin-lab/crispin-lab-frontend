# API Client 와 데이터 패칭

> **이 문서의 범위**: 백엔드 API 와의 통신 패턴 — 타입 생성, fetch 래퍼, TanStack Query 사용 규칙, 에러 처리.
>
> **인증 토큰 흐름·BFF 어댑터**: `auth.md`
> **Server / Client 분리**: `architecture.md`

## OpenAPI 타입 자동 생성

백엔드는 `restdocs-api-spec` 으로 `openapi3.json` 을 산출한다. 프론트는 이를 단일 소스로 삼는다.

- 도구: `openapi-typescript` (`pnpm add -D openapi-typescript`)
- 산출 위치: `src/lib/api/schema.d.ts`
- 명령: `pnpm api:gen` (package.json scripts 에 등록)
- **수동 타입 작성 금지** — 백엔드 계약을 손으로 옮기지 않는다. 누락·드리프트의 원인.

```bash
# 예: 로컬 백엔드의 산출물을 그대로 옮길 때
pnpm api:gen --input ../crispin-lab-backend/build/api-spec/openapi3.json \
             --output src/lib/api/schema.d.ts
```

산출 타입은 `paths`, `components.schemas` 형태로 들어온다. 도메인 단위 별칭을 한 곳 (`src/lib/api/types.ts`) 에서 만들어 호출부가 OpenAPI 산출 구조를 직접 import 하지 않게 한다.

```ts
// src/lib/api/types.ts
import type { components } from './schema'

export type Page = components['schemas']['PageResponse']
export type PageSummary = components['schemas']['PageSummaryResponse']
export type Visibility = components['schemas']['Visibility']
```

## 도메인 ID 와 브랜드 타입

백엔드의 `EntityIdJacksonConfiguration` 이 ID 를 string 으로 직렬화한다. 프론트는 그 string 을 받자마자 브랜드 타입으로 lift 해서 도메인 경계 안에서는 안전한 타입으로 흐르게 한다.

```ts
// src/lib/api/ids.ts
export type PageId = string & { readonly __brand: 'PageId' }
export type SpaceId = string & { readonly __brand: 'SpaceId' }
export type UserId = string & { readonly __brand: 'UserId' }

export const asPageId = (raw: string): PageId => raw as PageId
export const asSpaceId = (raw: string): SpaceId => raw as SpaceId
export const asUserId = (raw: string): UserId => raw as UserId
```

- 응답 디코딩 직후 한 번만 `as` 를 사용한다 (`conventions.md` "`as` 캐스팅 지양" 의 예외).
- URL search params, dynamic route param, form 입력으로 받은 string 도 같은 헬퍼로 lift.
- 도메인 함수 시그니처는 항상 브랜드 타입을 받는다 — plain string 을 받으면 호출부에서 미검증 입력이 흘러든다.

## fetch 래퍼

`src/lib/api/client.ts` 에 단일 fetch 래퍼를 둔다. 호출부는 raw `fetch` 를 직접 쓰지 않는다.

```ts
// src/lib/api/client.ts (개요)
type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: 'include',     // BFF 의 session cookie 동봉 (auth.md)
    signal: options.signal,
  })

  if (!response.ok) {
    throw await ApiError.fromResponse(response)
  }
  return response.json() as Promise<T>
}
```

- **base URL** 은 환경 변수로. 프론트가 직접 백엔드를 호출하는 경로는 없고, 같은 origin 의 BFF (`/api/...`) 를 거친다 (`auth.md`).
- **credentials: 'include'** — httpOnly session cookie 가 자동으로 동봉되게.
- **타임아웃 / 재시도** — fetch 단에서는 두지 않는다. TanStack Query 의 `retry`, `staleTime` 으로 제어.
- **AbortController** — TanStack Query 가 자동으로 `signal` 을 넘긴다. 래퍼는 그대로 전달.

## ApiError 모델

백엔드 에러 응답은 `{ code: string, message: string }` 형태. 호출부가 코드로 분기할 수 있게 클래스로 lift.

```ts
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const body = await response.json().catch(() => ({}))
    return new ApiError(
      response.status,
      body.code ?? 'UNKNOWN',
      body.message ?? '요청을 처리하지 못했습니다.',
    )
  }
}
```

- 사용자에게 보일 메시지는 **백엔드의 `message` 를 우선 사용**. fallback 만 프론트가 만든다.
- 분기 (예: `PAGE_NOT_FOUND` 이면 404 페이지로) 는 `code` 로 한다 — `message` 매칭 금지.
- 401 (`INVALID_SESSION`) 은 글로벌하게 처리해 로그인 페이지로 redirect (`auth.md`).

## TanStack Query — Key Factory 패턴

query key 를 도메인 별로 묶어 한 곳에서 관리한다. invalidation 의 정합성을 보장.

```ts
// src/lib/api/queries/page.ts
export const pageKeys = {
  all: ['page'] as const,
  lists: () => [...pageKeys.all, 'list'] as const,
  list: (spaceId: SpaceId) => [...pageKeys.lists(), spaceId] as const,
  details: () => [...pageKeys.all, 'detail'] as const,
  detail: (pageId: PageId) => [...pageKeys.details(), pageId] as const,
} as const
```

규칙:
- **계층 구조**: `all` → `lists`/`details` → 구체 인자. 상위 key 로 invalidate 하면 하위까지 자동 무효화.
- **as const**: 튜플 타입이 유지되어야 TanStack Query 의 키 비교가 안정적.
- **인자 순서**: route param 의 순서와 동일하게.

## queryOptions 와 hook 분리

TanStack Query v5 의 `queryOptions(...)` factory 를 활용해 hook 과 options 를 분리한다. RSC 의 prefetch 에 같은 options 를 재사용 가능.

```ts
// src/lib/api/queries/page.ts
export const pageDetailOptions = (pageId: PageId) =>
  queryOptions({
    queryKey: pageKeys.detail(pageId),
    queryFn: ({ signal }) => apiFetch<Page>(`/api/pages/${pageId}`, { signal }),
    staleTime: 30_000,
  })

// hook
export function usePage(pageId: PageId) {
  return useQuery(pageDetailOptions(pageId))
}
```

- hook 은 얇게 — options factory 가 본체.
- Server Component 에서 prefetch: `queryClient.prefetchQuery(pageDetailOptions(pageId))` 후 `dehydrate(queryClient)` 로 Client 에 hydrate.

## Mutation 과 invalidation

```ts
export function usePagePublish() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (pageId: PageId) =>
      apiFetch<void>(`/api/pages/${pageId}/publish`, { method: 'POST' }),
    onSuccess: (_, pageId) => {
      queryClient.invalidateQueries({ queryKey: pageKeys.detail(pageId) })
      queryClient.invalidateQueries({ queryKey: pageKeys.lists() })
    },
  })
}
```

- **invalidation 범위는 정확히** — 너무 좁으면 stale, 너무 넓으면 불필요한 재요청.
- **상위 key 로 한 번에**: `pageKeys.lists()` 로 모든 list 가 무효화된다.
- **낙관적 갱신**: `onMutate` + `onError` rollback 패턴. 단순한 토글·정렬 변경에 우선 적용. 복잡한 폼 제출은 invalidation 으로 충분.

## staleTime / gcTime

| 데이터 성격 | staleTime | gcTime |
|-------------|-----------|--------|
| 거의 변하지 않음 (사용자 프로필, 마스터 데이터) | 5 분 | 10 분 |
| 자주 보지만 자주 변하지 않음 (페이지 본문) | 30 초 | 5 분 |
| 실시간성 (알림, 댓글) | 0 (always stale) | 1 분 |

기본값은 0 인데, 그러면 같은 페이지를 두 번 가져오는 경우가 잦아 명시값을 두는 게 낫다.

## Server Component 에서 데이터 패칭

```tsx
// app/pages/[pageId]/page.tsx
export default async function PageDetail({ params }: { params: { pageId: string } }) {
  const pageId = asPageId(params.pageId)
  const page = await apiFetchServer<Page>(`/v1/pages/${pageId}`)
  return <PageEditor initialPage={page} />
}
```

- `apiFetchServer` 는 `apiFetch` 와 별개로 — `cookies()` 에서 session 을 읽어 Bearer 로 변환해 백엔드 직접 호출 (`auth.md` 참조).
- 또는 같은 BFF (`/api/...`) 를 호출해도 됨. 호출 비용이 한 hop 늘지만 인증 흐름이 단일.

## 자주 빠뜨리는 것

- **query key 를 호출부에서 직접 작성** — `useQuery({ queryKey: ['page', pageId], ... })` 처럼 인라인하면 invalidation 누락이 빠진다. factory 로 통일.
- **mutation 후 invalidation 누락** — 화면이 갱신되지 않으면 invalidation 범위를 다시 본다.
- **`enabled` 옵션 없이 nullable param 으로 useQuery** — 라우트가 마운트되기 전에 `null` 로 호출되면 에러. `useQuery({ ..., enabled: pageId != null })`.
- **에러를 `try/catch` 로 삼킴** — TanStack Query 의 `error` 상태로 표현. 글로벌 에러 boundary 가 마지막 안전망.
- **`as` 캐스팅으로 OpenAPI 타입을 우회** — `as Page` 가 보이면 타입 산출이 비어 있거나 잘못된 응답 매핑이 있다는 신호.
