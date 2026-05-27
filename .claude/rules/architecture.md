# 아키텍처

> **이 문서의 범위**: 디렉토리 구조, Server / Client Component 분리, 라우팅 정책, 컴포넌트 책임 경계.
>
> **API 호출과 데이터 패칭 패턴**: `api-client.md`
> **인증·세션**: `auth.md`
> **에디터 (TipTap)**: `editor.md`
> **UI 패턴 (shadcn / cn / variant / 접근성)**: `ui.md`
> **상태 관리 (서버 / 폼 / URL / local)**: `state.md`

## 디렉토리 구조

Next.js 공식 가이드 (`Project Organization`) 의 권장 패턴을 따른다. `src/` 디렉토리 사용, `@/*` import alias.

```
src/
  app/                  # App Router — 라우팅 파일 (page, layout, route, loading, error) 만
    (도메인 라우트)/
      page.tsx
      _components/      # 본 라우트 한정 컴포넌트 (콜로케이션, underscore prefix 로 라우팅 제외)
    api/                # Next.js Route Handler — BFF 어댑터 등 (auth.md 참조)
  components/
    ui/                 # shadcn/ui primitives (button, card, dialog 등)
    {도메인-무관 공용 컴포넌트}
  hooks/                # 재사용 React hooks
  lib/
    api/                # API 클라이언트, OpenAPI 산출 타입, query key factory
    schemas/            # zod 스키마 (외부 입력 검증)
    utils.ts            # shadcn 의 `cn` 등 공용 유틸
  styles/               # global css
```

### 콜로케이션과 공유의 기준

- **한 라우트에서만 쓰는 컴포넌트**: `app/<route>/_components/` 에 둔다. underscore prefix 가 routing path 에서 제외시킨다.
- **여러 라우트가 공유하는 컴포넌트**: `src/components/` 로 승격.
- **shadcn/ui 가 생성한 primitive**: 항상 `src/components/ui/`. 직접 수정해도 무방하지만 그 경우 주석으로 의도 한 줄.
- **두 번째 재사용이 생긴 시점에 승격** — 처음부터 공유 위치에 두지 않는다 (성급한 공통화 지양).

### 도메인 간 의존

도메인을 디렉토리로 분리하지 않는다 (현재 도메인 수가 적고, Next.js 공식 가이드도 feature-folder 를 강제하지 않는다). 다만 컨벤션상:

- 같은 도메인 (페이지, 스페이스, 댓글) 의 컴포넌트는 같은 prefix 파일명 / 같은 라우트 그룹 아래에 모은다.
- 도메인 hook 은 `hooks/usePage*.ts`, API 함수는 `lib/api/page.ts` 식으로 도메인 이름이 파일명에 드러나게 한다.
- cross-domain 직접 import 가 생기면 — 첫 번째 등장에서는 받아들이고, 두 번째 등장에서 공통 위치로 추출.

## Server Component vs Client Component

App Router 의 기본은 Server Component 다. `'use client'` 는 다음 중 하나에 해당할 때만 명시한다.

- 상호작용 (`onClick`, `onChange`, form 등)
- 브라우저 API (`window`, `localStorage`, `IntersectionObserver`)
- React state / effect (`useState`, `useEffect`, `useReducer`)
- TanStack Query / TipTap 같은 클라이언트 전용 라이브러리 hook

### 데이터 패칭 위치

| 상황 | 위치 | 비고 |
|------|------|------|
| 페이지 첫 화면 데이터 | Server Component | `fetch` / API client 직접 호출. cookies() 로 인증 컨텍스트 추출. |
| 상호작용 후 재조회 / 무한 스크롤 / 폴링 | Client Component + TanStack Query | `useQuery` |
| Mutation (생성·수정·삭제) | Client Component + TanStack Query | `useMutation` + invalidation |
| Form submit 후 navigation | Server Action 또는 Route Handler | 폼 제출 흐름이 단순할 때만 Server Action |

Server Component 에서 받은 초기 데이터를 Client Component 에 `initialData` 로 넘겨 hydrate 하는 패턴을 우선 시도. TanStack Query 의 `dehydrate` / `HydrationBoundary` 가 정석.

### Client Component 경계는 최대한 안쪽으로

`'use client'` 가 붙은 컴포넌트의 children 은 자동으로 Client 가 되지 않지만, props 로 받은 컴포넌트 트리는 RSC 로 남는다. 인터랙티브한 잎(leaf) 컴포넌트만 Client 로 빼고 부모는 Server 로 두는 패턴을 우선한다.

## 라우팅 정책

- 경로는 영문 소문자, 단어 구분은 hyphen 없음 — 단어 1 개 (`/spaces`) 또는 dynamic segment (`/spaces/[spaceId]`). 두 단어 이상이 필요하면 hyphen 보다 라우트 그룹·중첩 segment 를 먼저 검토.
- dynamic segment 이름은 도메인 타입과 동일 (`[pageId]`, `[spaceId]`).
- 버전 prefix 는 두지 않는다 (API 가 아니라 UI 경로다). API 호출 측은 `api-client.md` 의 base URL 관리.
- route group (`(marketing)`, `(dashboard)`) 으로 layout 을 분리하되 URL 에는 노출되지 않게 한다.

## 컴포넌트 책임 분리

백엔드의 controller 가 얇게 유지되어야 UseCase 가 진짜 비즈니스 단위로 남는 정신과 같다.

| 가진다 | 가지지 않는다 |
|--------|---------------|
| **Page (`page.tsx`)**: 라우팅 메타 (params, searchParams), 데이터 조립, 자식 컴포넌트 props 주입 | 비즈니스 로직, 복잡한 form 상태, 도메인 검증 |
| **Component**: props 수신, 렌더링, 이벤트 콜백 emit | 직접 API 호출 (hook 으로 분리), 글로벌 상태 직접 변경 |
| **Hook (`use*`)**: 데이터 패칭, mutation, derived 상태 | JSX 반환, DOM 직접 조작 |
| **lib/api**: HTTP 통신, 응답 ↔ 도메인 타입 변환 | UI 상태, React hook |

### 자주 빠뜨리는 것

- **Page 안에 form 상태를 그대로** — 폼이 한 화면이라도 useForm hook 으로 분리하면 페이지가 라우팅 책임만 남는다.
- **Server Component 에서 TanStack Query 사용 시도** — `useQuery` 는 hook 이라 RSC 에서 못 쓴다. 서버에서는 API client 직접 호출 → Client 에 hydrate.
- **`'use client'` 를 layout / page 최상단에 일괄 부착** — Client 경계가 트리 전체로 퍼지면 성능·번들 사이즈 손해. 상호작용이 필요한 잎만 Client.
- **`params` / `searchParams` / `cookies()` 의 `await` 누락** — Next 16 에서 모두 async. 시그니처는 `{ params: Promise<{ pageId: string }> }` 형태, 본문에서 `const { pageId } = await params`.
- **route handler 정책** — `auth.md` 의 catch-all BFF (`src/app/api/[...path]/route.ts`) 가 cookie↔Bearer 변환을 책임진다. 그 외 **endpoint 별 단순 프록시 route handler 는 만들지 않는다** (`src/app/api/pages/route.ts` 같은 것). 별도 분리는 변환 책임이 추가될 때만 (예: 응답 정규화, 추가 권한 검증) — 분리 사유를 파일 상단 주석 한 줄로.

## 환경 변수와 빌드 모드

- `NEXT_PUBLIC_` prefix 가 붙은 변수만 클라이언트 번들에 포함된다. 시크릿은 절대 `NEXT_PUBLIC_` 으로 두지 않는다.
- 새 환경 변수를 도입하면 `.env.example` 에 반드시 추가 (이름 + 한 줄 설명, 값은 빈 문자열 또는 placeholder).
- `next.config.ts` 의 변경은 별도 PR 검토 — Tailwind / typed routes / image domains 등 빌드 동작이 바뀌면 회귀가 크다.
