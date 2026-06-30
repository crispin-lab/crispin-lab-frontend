---
name: convention-check
description: PR 전 컨벤션 체크. `.claude/rules/` 의 프론트 룰 기준으로 변경된 코드를 사전 리뷰한다.
---

`.claude/rules/` 의 룰 문서들을 기준으로 현재 변경사항을 사전 리뷰합니다. React / Next.js (App Router) / TypeScript 프론트 레포 전용입니다.

## 실행 순서

### 1단계: 룰 문서 로드

다음 파일을 모두 읽는다 (`.claude/CLAUDE.md` 의 인덱스 전체):

- `.claude/rules/commit.md` — 커밋 메시지 형식 (`[LAB-N]:` 제목, 한국어 본문, Jira 라벨)
- `.claude/rules/docs-style.md` — 문서 한국어 정책 (문서 변경 PR 일 때 특히 중요)
- `.claude/rules/architecture.md` — 디렉토리, Server / Client Component, 라우팅, 컴포넌트 책임
- `.claude/rules/conventions.md` — 네이밍, 타입, 검증, 함수, 테스트, 포맷팅, PR 체크리스트
- `.claude/rules/design.md` — 시각 방향 (색 역할 / 폰트 / dark·light / 레이아웃 골격 / accent 한도)
- `.claude/rules/ui.md` — shadcn primitive, `cn`, variant, 접근성
- `.claude/rules/state.md` — 서버·폼·URL·local 상태 분리
- `.claude/rules/comments.md` — 주석·JSDoc·TODO 정책
- `.claude/rules/api-client.md` — fetch 래퍼, TanStack Query, OpenAPI 산출 타입
- `.claude/rules/auth.md` — 세션 cookie ↔ Bearer, BFF 어댑터
- `.claude/rules/editor.md` — TipTap, `[[페이지명]]` 위키 링크

존재하지 않는 룰 파일을 읽으려 하지 않는다. `ls .claude/rules/` 와 다른 파일이 본 목록에 있으면 즉시 사용자에게 보고하고 멈춘다.

### 2단계: 변경 파일 파악

- `git diff --name-only HEAD` 로 변경된 파일 목록을 확인한다.
- 인자(`$ARGUMENTS`)가 있으면 해당 파일만 대상으로 리뷰한다.
- 변경이 없으면 staged 변경(`git diff --name-only --cached`)을 본다.
- 변경 파일 중 자동 산출물 (`src/lib/api/schema.d.ts`, `.next/`, `out/`, `build/`, `next-env.d.ts`) 은 리뷰 대상에서 제외한다.

### 3단계: 작업 유형 판별

변경된 파일들의 diff 를 읽고 작업 유형을 판별한다:

- **새 컴포넌트 / 페이지** — `src/app/<route>/page.tsx` 또는 `src/components/...`
- **타입 / 스키마 추가** — `src/lib/api/types.ts`, `src/lib/api/ids.ts`, 새 도메인 타입
- **새 route handler / BFF 어댑터** — `src/app/api/...`
- **TanStack Query 추가 / 수정** — `src/lib/api/queries/...`, `use*` hook
- **OpenAPI 산출 갱신** — `src/lib/api/schema.d.ts` (수동 편집은 금지 — `pnpm api:gen` 만)
- **에디터 (TipTap) 변경** — `src/components/editor/...`
- **인증 흐름 변경** — `src/app/api/auth/...` 또는 `cookies()` 사용처
- **버그 수정** — 동작 변경 + 재현 테스트
- **리팩토링 / 디렉토리 이동** — 콜로케이션 ↔ 공유 위치
- **문서 / 룰 변경** — `.claude/...`

판별한 유형에 맞는 체크리스트(`conventions.md` "PR 전 사전 리뷰 체크리스트" 섹션 + 관련 룰 문서 끝의 "자주 빠뜨리는 것")를 적용한다.

### 4단계: 리뷰 보고

다음 항목을 룰 문서 기준으로 점검한다.

**공통 체크 (`conventions.md`):**

- **네이밍** — 도메인 의미 우선, `~Data` / `~Dto` / `~Info` / `~Response` suffix 회피, 시점 필드 (`createdAt` vs `expectedReviewAt`), 컴포넌트는 역할 (`PageEditorPanel`, `SubmitButton`), hook 은 `use` + 명사구
- **타입 안정성** — `any` 금지 (`unknown` + narrowing), `as` 캐스팅 / `!` non-null assertion 지양 (예외: 응답 디코딩 경계의 ID lift), 브랜드 타입 (`PageId`, `SpaceId`), 리터럴 union, 추론 가능 위치 타입 생략, 함수 시그니처는 반환 타입 명시
- **검증** — 외부 입력 (API 응답 / form / URL params) 은 경계에서 한 번. 산출 OpenAPI 타입 + narrowing 으로 충분한지, 별도 런타임 검증이 필요한지 (zod 도입 시 표준). 내부 상태는 타입으로 표현 (discriminated union)
- **함수형 스타일** — early return, `?.` / `??` 적극, 빈 배열 분기 불필요 (`items.map` 안전), 긍정형 필터 (`isIncluded` 우선)
- **React 패턴** — `useEffect` 가 외부 동기화인지 (derived value / 이벤트 핸들러로 풀리는지), key 가 stable identifier 인지, hook dependency array 가 거짓말 안 하는지, Provider 가 `src/app/providers.tsx` 한 곳에 모였는지
- **함수 시그니처** — 인자가 2개 이상 boolean 이면 named object, optional 인자에 디폴트값
- **상수화** — 한 곳에서만 쓰이는 리터럴·헬퍼·컴포넌트 인라인
- **테스트** — `getByRole` / `getByText` 우선 (`getByTestId` 최후), `userEvent` > `fireEvent`, MSW 로 HTTP mock, `describe` 컨텍스트 중복 금지
- **포맷팅** — Prettier `printWidth: 100`, 와일드카드 import 금지 (`import * as X` 금지)
- **에러 메시지** — 한국어 존댓말, 한 문장, 백엔드 `message` 우선, 내부 ID / 스택 노출 금지
- **주석** — `comments.md` 의 "쓰지 않는 것" 목록. JSDoc 으로 함수 설명 금지

**아키텍처 / 경계 체크 (`architecture.md`):**

- `'use client'` 가 leaf 컴포넌트까지만 내려갔는가 (layout / page 최상단 부착 금지)
- Server Component 에서 `useQuery` / `useState` 같은 hook 을 호출하지 않는가
- 콜로케이션 적합 — 한 라우트 전용은 `app/<route>/_components/`, 두 번째 재사용 시 `src/components/` 로 승격
- shadcn primitive 는 `src/components/ui/` 에서만. 직접 수정했다면 사유 한 줄 주석
- 라우팅 경로가 영문 소문자 단일 단어 또는 dynamic segment (`/spaces/[spaceId]`)
- `next.config.ts` 변경이 포함되면 별도 검토 신호

**API / 데이터 패칭 체크 (`api-client.md`):**

- 브라우저 호출은 `apiFetch('/api/...')` 만 사용 (절대 URL · `BACKEND_URL` 직접 사용 금지)
- Server Component / BFF 만 `apiFetchServer` + `BACKEND_URL` 사용
- query key 가 `pageKeys.detail(...)` 같은 factory 를 거치는가 (호출부에서 인라인 배열 금지)
- mutation 후 invalidation 범위가 적절한가 (너무 좁아 stale, 너무 넓어 과도 재요청)
- `useQuery` 의 nullable param 은 `enabled` 옵션으로 가드
- 응답 디코딩 직후 ID 가 `asPageId(...)` 등으로 브랜드 타입 lift 되었는가
- OpenAPI 산출 타입을 직접 import 하지 않고 `src/lib/api/types.ts` 의 별칭을 통해 가져왔는가

**인증 체크 (`auth.md`):**

- Route Handler 에서 `cookies()` 가 `await` 되었는가 (Next 16 async API)
- 클라이언트가 토큰 자체를 보지 못하는가 (응답 body 에 토큰 노출 금지, `httpOnly` cookie 만)
- `Set-Cookie` 속성에 `HttpOnly; SameSite=Lax; Path=/` 가 빠지지 않았는지. `Secure` 는 production 에서만 강제 (로컬 HTTP 분기 누락 → 로컬에서 cookie 미설정으로 깨지는 회귀를 잡는다)
- 401 처리가 한 곳 (`QueryCache` `onError`) 에 모였는가 — silently null 로 떨어뜨리지 않는가
- catch-all BFF (`src/app/api/[...path]/route.ts`) 외에 endpoint 별 단순 프록시 route handler 가 새로 생기지 않았는가

**UI 체크 (`ui.md`):**

- `cn` (`@/lib/utils`) 만 사용 (다른 className concat 도구 금지)
- 외부에서 받은 `className` 은 항상 마지막에 `cn(base, className)` 으로 머지
- 두 갈래 이상 조건부 class 가 생기면 `class-variance-authority` (cva) 로 추출
- loading / empty / error 세 상태가 모두 처리되었는가 (TanStack Query `isPending`, `isError`, data 0개)
- 라우팅은 `<Link>`, 액션은 `<Button>` — 혼용 시 `asChild` 명시
- 접근성: label-input 연결, dialog focus trap, menu `aria-expanded`

**상태 관리 체크 (`state.md`):**

- 서버 데이터는 TanStack Query, 폼은 controlled `useState` (RHF 도입 시 표준), 공유·뒤로가기 필요한 상태는 URL, 한 컴포넌트 안만 쓰면 `useState`
- props → state 동기화를 `useEffect` 로 하지 않았는가 (derived value 로 계산)
- 전역 클라이언트 상태 라이브러리 (Zustand 등) 가 새로 도입되지 않았는가 (도입 전까지 금지)

**에디터 체크 (`editor.md`, 변경에 TipTap 가 포함될 때만):**

- 저장은 `editor.getJSON()` (HTML 직렬화 금지)
- mention `suggestion.char` 가 `[[` 로 설정되었는가 (`@` 디폴트 사용 금지)
- 에디터 컴포넌트가 `'use client'` 인가
- 확장 set 이 Editor / Viewer 양쪽에서 같은 module 을 import 하는가

**작업 유형별 체크:**

`conventions.md` "PR 전 사전 리뷰 체크리스트" 의 해당 절 (새 컴포넌트 PR / API 통신 추가 PR / 버그 수정 PR) 을 그대로 항목별 검증한다.

### 5단계: 보고 형식

```text
⚠️⚠️ 필수 수정
- [src/path/to/File.tsx:42] 어떤 위반인지 — (해당 룰 섹션명)
  근거: 짧은 인용 또는 설명

⚠️ 권장 개선
- [src/path/to/File.tsx:88] 개선 제안 — (해당 섹션명)

✅ 잘 지킨 항목
- 항목 (간단히)
```

- 위반 위치는 반드시 `파일:라인` 으로 표시한다.
- 해당 룰 섹션명을 함께 적는다 (예: "타입 안정성 — `any` 금지", "auth.md — `cookies()` await").
- 보안·인증·아키텍처 경계 위반은 **필수 수정** 으로 분류한다.
- 우선순위가 모호하면 "필수 수정" 으로 안전하게 분류한다.
- 자동 산출물 (`src/lib/api/schema.d.ts`) 에 대한 지적은 만들지 않는다.
