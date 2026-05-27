# 코딩 컨벤션

> **이 문서의 범위**: 네이밍, 타입, 검증, 함수 작성, 테스트, 포맷팅 등 **코딩 스타일과 컨벤션**.
>
> **디렉토리·컴포넌트 책임**: `architecture.md`
> **API 호출 / TanStack Query 패턴**: `api-client.md`
> **UI 패턴 (shadcn / cn / variant / 접근성)**: `ui.md`
> **상태 분류 (서버 / 폼 / URL / local)**: `state.md`

## 기본 원칙

- 모든 규칙의 판단 기준: **유지보수에 도움이 되는가?**
- IDE 경고를 무시하지 않는다. 무시해야 하면 `// eslint-disable-next-line <rule>` + 한 줄 *왜*.
- 한 곳에서만 쓰이는 헬퍼·상수는 만들지 않는다. 인라인이 낫다.
- 성급한 공통화 지양. 중복이 실제 통증이 될 때 추출한다.

## 네이밍

### 도메인 의미를 먼저 드러낸다

이름만 보고 역할이 추론되어야 한다. 구현 디테일(`Dto`, `Data`, `Info`, `Response`) 은 앞에 노출하지 않는다.

```ts
// BAD
type PageData = { ... }
type PageDto = { ... }
function getPageData() { ... }

// GOOD
type Page = { ... }
type PageSummary = { ... }            // 역할 노출 (Summary, Snapshot, Payload)
function fetchPage(id: PageId): Promise<Page> { ... }
```

- 컴포넌트, hook, API 함수, 타입은 같은 유비쿼터스 언어를 쓴다 (`Page`, `Space`, `Comment`).
- `Dto`, `~Data`, `~Info`, `~Response` 같은 의미 없는 suffix 는 피한다. 외부 계약 (OpenAPI 산출 타입) 은 자동 생성이라 예외.
- 미국식 영어를 기본으로 (`canceled`, `color`).

### 컴포넌트 이름은 역할로

```ts
// BAD
function Page1() { ... }              // 의미 없음
function MyButton() { ... }           // "My" 는 정보 0
function ListItem({ data }) { ... }   // ListItem 은 너무 넓음

// GOOD
function PageEditorPanel() { ... }
function SubmitButton() { ... }
function PageListItem({ page }) { ... }
```

- 파일명도 컴포넌트와 동일 PascalCase (`PageEditorPanel.tsx`).
- 컴포넌트는 한 파일에 한 개를 원칙으로. 같이 묶는 게 자연스러운 서브컴포넌트만 같은 파일.

### Hook 은 `use` + 명사구

```ts
// GOOD
function usePage(id: PageId) { ... }              // 단건 조회
function usePageList(spaceId: SpaceId) { ... }    // 목록
function usePageEditor() { ... }                  // 에디터 상태 묶음

// BAD
function useGetPage(id) { ... }                   // get 은 동작, 시그니처가 이미 fetch 를 말한다
function pageHook() { ... }                       // hook 규칙 위반
```

Mutation hook 은 동사형이 명확할 때 동사 허용: `usePagePublish`, `useSpaceDelete`. 호출부에서 `const { mutate: publish } = usePagePublish()` 처럼 다시 동사로 받기 쉽게.

### 값 획득 vs 상태 변경

| 의미 | 패턴 | 예 |
|------|------|-----|
| 값 획득 (pure) | 명사 또는 `get*` 회피 | `pageTitle`, `totalCount` |
| 동기 액션 | 현재형 동사 | `publish()`, `archive()` |
| 비동기 액션 | 현재형 동사 (Promise 반환) | `fetchPage()`, `savePage()` |
| 이벤트 핸들러 | `handle*` | `handleSubmit`, `handlePageClick` |

```ts
// BAD
function getStatus() { ... }          // getter 스타일 (TS 에서는 그냥 프로퍼티)
function published() { ... }          // 과거형 — 이미 완료된 것처럼 읽힘

// GOOD
const status = page.status
function publish() { page.status = 'PUBLISHED' }
```

### 날짜 필드는 시점 의미를 정확히

`~At` 은 **이미 발생한 시점**에만 사용한다. 미래·예정 시점은 `expected~` 또는 다른 형태로.

```ts
// GOOD
createdAt: string                     // 생성된 시점
publishedAt: string
deletedAt: string | null              // soft delete
expectedReviewAt: string              // 검토 희망 시점 (아직 발생하지 않음)

// BAD
publishAt: string                     // 현재형 — 의미 모호
```

`updatedAt` 은 "어떤 변경이든 발생한 시점". 특정 비즈니스 시점(`publishedAt` 등) 을 대체하지 않는다.

## 타입 안정성

### `any` 금지, `unknown` 으로

`any` 는 타입 안정성 회피의 대표 패턴. `unknown` + narrowing 또는 generic 으로 표현.

```ts
// BAD
function handle(payload: any) { ... }

// GOOD
function handle<T extends PageEvent>(payload: T) { ... }
function handle(payload: unknown) {
  if (isPageEvent(payload)) { ... }
}
```

예외: 외부 라이브러리 타입이 `any` 로 새는 경계에서만, 즉시 narrowing 후 도메인 타입으로 묶는다.

### `as` 캐스팅 / `!` non-null assertion 지양

타입 시스템을 우회한다는 신호. 정말 필요하면 한 줄 *왜* 주석 또는 type guard 로 대체.

```ts
// BAD
const page = data as Page
const title = page!.title

// GOOD (narrowing)
if (!isPage(data)) throw new Error('Invalid page payload')
const title = data.title

// 예외: EntityId brand 타입처럼 런타임 검증이 끝난 외부 입력을 도메인 타입으로 lift 할 때
const id = raw as PageId               // 응답 디코딩 경계 한 곳만, api-client.md 참조
```

### 도메인 타입을 우선 (브랜드 타입 / 리터럴 union)

문자열·숫자로 넓게 두지 않는다. URL, 식별자, 상태값은 도메인 타입.

```ts
// BAD
type Page = {
  id: string
  visibility: string
  coverImageUrl: string
}

// GOOD
type PageId = string & { readonly __brand: 'PageId' }
type Visibility = 'PUBLIC' | 'INTERNAL' | 'PRIVATE'

type Page = {
  id: PageId
  visibility: Visibility
  coverImageUrl: URL                  // 또는 string 유지하되 변수명에 Url 포함
}
```

- ID 필드는 항상 브랜드 타입 (`PageId`, `SpaceId`, `UserId`). 응답 디코딩 경계에서 `as PageId` 한 번으로 lift, 이후는 도메인 타입으로 흐른다 (`api-client.md` 참조).
- 허용값이 정해진 입력은 리터럴 union 또는 `as const` 객체.
- 외부 계약 (OpenAPI 산출 타입) 은 String 으로 와도 도메인 경계에서 브랜드 타입으로 교체.

### 타입 일관성 유지

같은 데이터의 변환 (`String(id)`, `Number(value)`) 이 여러 곳에 흩어져 있으면 설계 문제다. 변환은 경계 (API 응답 디코딩, form 입력 파싱) 에서 한 번만.

### 타입 추론이 가능하면 타입 생략

```ts
// BAD
const page: Page = await fetchPage(id)
const titles: string[] = pages.map((page) => page.title)

// GOOD
const page = await fetchPage(id)
const titles = pages.map((page) => page.title)
```

함수 시그니처는 명시 (return type 도) — 추론을 깨는 시점을 컴파일러가 잡게.

```ts
// GOOD
async function fetchPage(id: PageId): Promise<Page> { ... }

// BAD
async function fetchPage(id: PageId) { ... }    // 반환 타입 불명
```

### 불변 우선

- `const` 기본. `let` 은 정말 재할당이 필요할 때만.
- 객체·배열은 spread (`{ ...page, title }`, `[...items, item]`) 로 새 값. mutate (`page.title = ...`, `items.push(...)`) 하지 않는다.
- `Readonly<T>`, `ReadonlyArray<T>` 가 시그니처에 명시되면 그 의도를 지킨다.

## 검증

### 경계에서 한 번, 내부는 타입으로

| 위치 | 현재 표준 | 도입 시 표준 (zod / react-hook-form 도입 후) |
|------|----------|-----|
| API 응답 디코딩 | OpenAPI 산출 타입 + 필요 시 type guard | `pageSchema.parse(json)` (zod) |
| Form 입력 | controlled `useState` (단순 폼 한정) | `useForm({ resolver: zodResolver(schema) })` |
| URL search params / route params | 명시 narrowing (`asPageId(raw)`) + 빈/형식 검사 | `searchParamsSchema.parse(params)` (zod) |
| 내부 비즈니스 불변식 | TS 타입 (discriminated union, sealed pattern) | (동일) |

zod / react-hook-form 은 현재 `package.json` 에 없다. 첫 사용처가 생기는 시점에 의존성 추가 + 본 표의 "도입 시 표준" 칸이 그대로 발효된다. 그 전까지는 "현재 표준" 칸으로 충분한지 (대부분 페이지의 폼 1~2 개라면 충분) 먼저 판단한다.

내부 상태 검증을 런타임 `if` 로 흩뿌리지 않는다. 타입으로 상태를 표현하면 잘못된 상태를 가질 수 없게 된다.

### 외부 입력은 일찍 검증

API 응답, URL 파라미터, form 값을 "일단 믿고" 흘려보내지 않는다. zod (도입 시) 또는 type guard / 명시 narrowing 으로 경계에서 한 번 검증 후, 이후는 도메인 타입으로 흐른다.

### 에러 메시지

- 사용자에게 보일 메시지는 **한국어 존댓말, 한 문장, 구체적**. ("페이지를 찾을 수 없습니다.", "제목을 입력해 주세요.")
- 백엔드 에러 응답 (`{ code, message }`) 이 오면 `message` 를 우선 노출. fallback 만 프론트가 만든다 (`api-client.md` 참조).
- 메시지에 내부 ID, 경로, 스택 트레이스 노출 금지.

## 함수형 스타일

### 기본 원칙

가독성 우선. 함수형을 선호하되, 가독성이 떨어지면 명령형이 낫다.

### 빈 배열 분기 불필요

빈 배열에 `.map`, `.filter` 등을 호출해도 안전하다.

```ts
// BAD
if (items.length > 0) {
  return items.map(toResult)
}
return []

// GOOD
return items.map(toResult)
```

### `filter(x => x !== EXCLUDED)` 가 `!`/`Not` 보다 명확

```ts
// BAD
items.filter((it) => !isExcluded(it))

// GOOD
items.filter((it) => isIncluded(it))
items.filter((it) => it.status !== 'ARCHIVED')
```

### nullable 처리

optional chaining (`?.`) 과 nullish coalescing (`??`) 적극 활용. 중첩된 `if (x != null)` 지양.

```ts
// BAD
let title = ''
if (page != null) {
  if (page.draft != null) {
    title = page.draft.title
  }
}

// GOOD
const title = page?.draft?.title ?? ''
```

### early return 으로 들여쓰기 줄이기

```ts
// BAD
function handleSubmit(form) {
  if (form.isValid) {
    if (!form.isDirty) {
      // ...
    }
  }
}

// GOOD
function handleSubmit(form) {
  if (!form.isValid) return
  if (!form.isDirty) return
  // ...
}
```

## React 작성 패턴

### Hook 의 dependency array 는 거짓말하지 않는다

eslint-plugin-react-hooks 의 경고를 무시하지 않는다. 정말 의도된 누락이면 `// eslint-disable-next-line react-hooks/exhaustive-deps` + *왜* 한 줄.

### useEffect 남용 지양

`useEffect` 는 "외부 시스템과의 동기화" 가 본질이다. 다음은 모두 `useEffect` 가 아니라 다른 방식으로 풀린다.

| 잘못된 사용 | 대신 |
|-------------|------|
| props 변경에 따라 state 동기화 | 렌더 중에 derived value 계산 |
| 이벤트 핸들러 분기 후 부수효과 | 이벤트 핸들러 안에서 직접 |
| 비동기 fetch | TanStack Query (`useQuery`) |
| URL 동기화 | router push / `useSearchParams` |

### Key 는 stable identifier

```tsx
// BAD
items.map((item, index) => <Item key={index} ... />)

// GOOD
items.map((item) => <Item key={item.id} ... />)
```

index key 는 재정렬·삽입 시 React 가 잘못된 element 를 재사용해 상태가 꼬인다.

### Controlled vs Uncontrolled

폼 입력은 react-hook-form 으로 통일 (도입 시). 도입 전까지는 controlled `useState` 또는 form action 으로 단순 폼만 다룬다 — 폼이 늘면 RHF 도입을 별도 결정. 외부 라이브러리 (예: TipTap) 가 자체 상태를 갖는 경우는 uncontrolled 로 두고 onChange 만 받는다. 자세한 상태 분류는 `state.md`.

### Provider 중첩 회피

여러 Provider 를 root layout 에 쌓아 두면 가독성이 떨어진다. `src/app/providers.tsx` 한 파일에 모아 `RootLayout` 에서 한 줄로 wrapping.

## 함수 호출 가독성

### 파라미터가 2개 이상이면 named object 인자

위치 인자로 boolean 이 두 개 이상 들어가면 호출부에서 의미를 잃는다.

```ts
// BAD
function publish(page: Page, notify: boolean, dryRun: boolean) { ... }
publish(page, true, false)              // 두 boolean 의 의미가 호출부에서 안 보임

// GOOD
function publish(page: Page, options: { notify: boolean; dryRun: boolean }) { ... }
publish(page, { notify: true, dryRun: false })
```

단일 boolean 도 의미가 모호하면 named 로 올린다.

### Optional 인자에 디폴트값 명시

```ts
// GOOD
function fetchPageList(spaceId: SpaceId, { page = 0, size = 20 }: PageRequest = {}) { ... }
```

## 상수화

### 상수화가 필요한 경우

- 여러 곳에서 같은 값 재사용
- 숫자·문자열의 의미가 코드만으로 불명확 (`60_000`, `'sess_'`)
- 변경 가능성이 있는 비즈니스 정책 값

### 상수화가 불필요한 경우

- 한 곳에서만 사용
- 파라미터 이름으로 의미가 명확
- 표준 관례 (HTTP 200..299, JSX prop 의 `aria-*` 값)

```ts
// BAD: 한 곳에서만 사용 → 상수화 이점 없음
const PAGE_LIST_TITLE = '페이지 목록'
function PageListHeader() {
  return <h1>{PAGE_LIST_TITLE}</h1>
}

// GOOD: 인라인
function PageListHeader() {
  return <h1>페이지 목록</h1>
}
```

## 우발적 중복

```ts
// 중복으로 보여도 무조건 공통화하지 않는다.
// 사용처 변경 가능성이 낮을 때만 공통화.
// 공통 코드에 분기 (if (variant === ...)) 를 추가하느니 코드 분리를 우선한다.
```

### 단일 사용 헬퍼 메서드 제거

헬퍼는 **2 번 이상 사용**될 때만 만든다. 한 곳에서만 쓰이면 인라인. 예외: 복잡한 로직 분리, 테스트가 필요한 독립적 함수.

## 테스트

### 프레임워크

- **Vitest** + **React Testing Library** + **MSW** (API mock).
- E2E 가 필요하면 **Playwright** (도입 시점에 별도 도입 결정).

### 현재 상태

Vitest + RTL + MSW 인프라는 셋업 완료, `src/mocks/{handlers,server}.ts` 부트스트랩 완료. 실제 fixture 와 첫 테스트 케이스는 첫 사용처에서 추가한다. 첫 케이스 추가 시 본 문서의 "MSW 위치" 규칙대로 핸들러를 `src/mocks/handlers.ts` 에 모은다.

### 최소 커버리지

- 새로 추가된 분기, 사용자 인터랙션, 에러 분기마다 검증 케이스 추가.
- **실제 회귀를 잡는 테스트를 우선** — 컴포넌트가 렌더되는지만 보지 말고, 사용자 동작 결과 (텍스트 변화, navigation, API 호출) 까지 확인.

### React Testing Library 원칙

- `getByRole`, `getByLabelText`, `getByText` 우선. `getByTestId` 는 최후의 수단.
- 사용자 관점에서 쿼리 — 구현 디테일 (CSS class, 내부 state) 에 의존하지 않는다.
- `userEvent` 를 `fireEvent` 보다 우선 (실제 사용자 입력에 가까움).

### 외부 의존성은 mock/stub

API 호출은 MSW 로 HTTP 레벨에서 mock. 컴포넌트 내부의 `fetch` 를 직접 mock 하지 않는다.

- **위치**: handler 는 `src/mocks/handlers.ts` 에, `setupServer` 는 `src/mocks/server.ts` 에 둔다. 도메인별로 흩어지지 않게 한 곳에서 export.
- **strict 모드**: `server.listen({ onUnhandledRequest: 'error' })` — 핸들러가 없는 요청이 들어오면 명시적으로 실패시킨다. silent passthrough 는 fixture 누락을 숨겨 회귀를 못 잡는다.

### 컨텍스트 중복 금지

`describe` 가 도메인을 설명하면, 하위 `it` 에서 같은 접두어를 반복하지 않는다.

```ts
// GOOD
describe('PageEditor', () => {
  it('제목이 비어 있으면 저장 버튼이 비활성화된다', () => { ... })
})

// BAD
describe('PageEditor', () => {
  it('PageEditor 의 제목이 비어 있으면 저장 버튼이 비활성화된다', () => { ... })
})
```

## 포맷팅 / 린트

자동 검사 (`pnpm lint`, `pnpm format:check`) 와 리뷰 검사를 분리해 적는다. 둘 다 동등하게 따른다.

### 현재 자동 활성 (`eslint.config.mjs` + `.prettierrc`)

- ESLint: `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript` + `eslint-config-prettier`. 즉 Next.js 권장 + TypeScript + Prettier 충돌 회피.
- Prettier (`.prettierrc` 명시값): `printWidth: 100`, `semi: true`, `singleQuote: false` (double quote), `trailingComma: "all"`, `tabWidth: 2`, `prettier-plugin-tailwindcss` (className 자동 정렬). Prettier 디폴트에 의존하지 않고 모두 명시한다 — 후속 변경에서 디폴트가 흔들리지 않게.
- ignore: `.next/`, `out/`, `build/`, `next-env.d.ts`, `src/lib/api/schema.d.ts` (자동 산출물).

### 리뷰에서 확인 (자동 검사 아님)

다음 룰들은 현재 ESLint 설정에 명시적으로 포함되어 있지 않다. 그래서 **리뷰가 마지막 안전망**이다 (`/convention-check` 도 같은 항목을 점검한다). 실제 룰 추가는 별도 티켓.

- import 순서: 외부 → `@/*` → 상대 경로. 그룹 사이 한 줄 띄움. (도입 후보: `eslint-plugin-import` 또는 `@trivago/prettier-plugin-sort-imports`)
- **와일드카드 import 금지** (`import * as X`) — 트리쉐이킹·가독성 손해
- `no-unused-vars` (TS 컴파일러도 일부 잡지만 ESLint 룰화 필요)
- `react-hooks/exhaustive-deps` — Next preset 에 포함되어 있을 가능성 높지만, 명시 확인 필요
- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/no-non-null-assertion`

## 의존성 관리

- 패키지 매니저는 **pnpm** 고정. `package-lock.json`, `yarn.lock` 이 추가되면 그 PR 은 반려.
- Node 는 `.nvmrc` 의 24 고정. fnm / nvm 등 버전 매니저로 자동 활성화.
- 새 의존성을 추가할 때:
  - 번들 크기 영향 (`bundlephobia.com`) 을 한 번 확인.
  - 같은 일을 하는 기존 의존성이 있는지 grep.
  - Dev-only 인지 runtime 인지 정확히 (`-D` 여부).

## 코드 위생

### 미사용 코드 즉시 제거

방향 전환·리팩토링 후 남은 미사용 컴포넌트·hook·import 는 그 자리에서 지운다. ESLint 의 `no-unused-vars` 를 켜둔다.

### 콘솔 로그 제거

`console.log` 는 디버깅 흔적이지 운영 코드가 아니다. 운영에 필요한 로깅은 별도 logger 도입을 결정한 시점에 룰 문서로.

### `// @ts-ignore` / `// @ts-expect-error` 지양

정말 필요하면 `@ts-expect-error` + 한 줄 *왜*. `@ts-ignore` 는 사용 금지 (오류가 사라져도 주석이 남아 거짓 안전).

## PR 전 사전 리뷰 체크리스트

### 공통

- [ ] 이름이 도메인 용어와 맞는가 (컴포넌트, hook, API 함수, 타입이 같은 용어 체계인가)
- [ ] `any`, `as`, `!` 가 새로 도입되지 않았는가 — 도입했다면 *왜* 가 한 줄로 적혀 있는가
- [ ] 외부 입력 (API 응답 / form / search params) 이 zod 또는 type guard 로 검증되었는가
- [ ] `useEffect` 가 정말 외부 동기화인가 — derived value 나 이벤트 핸들러로 풀리는가
- [ ] 에러 메시지가 한국어 존댓말이고 구체적인가, 내부 정보 노출이 없는가
- [ ] 테스트가 실제 회귀를 잡는가 (렌더 확인만 하지 않는가)
- [ ] 한 곳에서만 쓰이는 상수·헬퍼·컴포넌트를 불필요하게 분리하지 않았는가
- [ ] Server / Client Component 경계가 적절한가 — `'use client'` 가 잎(leaf) 까지만 내려갔는가

### 새 컴포넌트 PR

- [ ] 파일명·컴포넌트명·export 명이 같은가 (PascalCase)
- [ ] 콜로케이션 위치가 정합한가 (`app/.../_components/` vs `src/components/`)
- [ ] props 타입이 명시되었는가 (`type Props = { ... }`)
- [ ] shadcn 의 primitive 를 직접 수정했다면 *왜* 가 주석 한 줄
- [ ] 접근성 (`aria-*`, `role`, label 연결) 이 갖춰졌는가

### API 통신 추가 PR

- [ ] OpenAPI 산출 타입을 사용했는가 (수동 타입 작성 금지)
- [ ] query key factory 를 통해 key 를 만들었는가 (`pageKeys.detail(id)`)
- [ ] Mutation 의 invalidation 범위가 적절한가
- [ ] 에러 핸들러가 사용자 메시지를 잘 전달하는가
- [ ] 인증이 필요한 경로면 BFF (`/api/...`) 를 통해 호출하는가 (`auth.md`)

### 버그 수정 PR

- [ ] 버그 원인을 코드상 어디였는지 설명할 수 있는가
- [ ] 수정이 최소 범위로 들어갔는가
- [ ] 재현 테스트가 추가되었는가
- [ ] 근본 원인 대신 증상만 막은 것은 아닌가

## 한 줄 요약

- 이름은 도메인 의미 중심으로
- 도메인 영역은 브랜드 타입·리터럴 union 중심으로
- 외부 입력은 경계에서 한 번에 검증
- 테스트는 실제 회귀를 잡도록
- Client 경계는 잎(leaf) 까지만 내려간다
- 한 곳에서만 쓰이는 리터럴·헬퍼는 인라인
