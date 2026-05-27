# 상태 관리

> **이 문서의 범위**: 어떤 상태를 어디에 둘지의 분류. 서버 / 폼 / URL / 컴포넌트 로컬 / 전역.
>
> **TanStack Query 사용 규칙**: `api-client.md`
> **UI 상태 (loading / empty / error)**: `ui.md`
> **Server / Client Component 경계**: `architecture.md`

## 상태 분류

| 종류 | 도구 | 사용 기준 | 비고 |
|------|------|----------|------|
| **서버 데이터** | TanStack Query (`useQuery` / `useMutation`) | 백엔드에서 받아오는 모든 것 | 캐시·invalidation 은 `api-client.md` |
| **폼 입력** | controlled `useState` (현재) → react-hook-form + zod (도입 시) | 사용자가 입력해 제출하는 값 | RHF/zod 미설치 — 폼이 늘면 별도 티켓 도입 |
| **URL 상태** | `useSearchParams` / `router.push` | 공유·뒤로가기·새로고침이 의미를 가지는 상태 | list page, filter, tab 선택 등 |
| **컴포넌트 로컬** | `useState` / `useReducer` | 한 컴포넌트 (또는 그 자식 트리) 안에서만 의미 있는 상태 | dialog open/close, hover, 임시 입력 |
| **전역 클라이언트 상태** | **도입 전까지 금지** | 위 네 가지로 표현 불가능한 cross-tree 상태가 명확히 필요할 때 | Zustand / Jotai 등 도입 시 별도 결정 |

## "어디에 둘까" 결정 흐름

1. 백엔드에서 오는가? → **서버 데이터**.
2. 새로고침해도 유지되어야 하는가? 링크로 공유되는가? → **URL**.
3. 사용자가 입력해 제출하는가? → **폼**.
4. 한 컴포넌트 안에서만 의미 있는가? → **로컬**.
5. 위 모두 아닌데 여러 컴포넌트가 읽고 쓰는가? → 먼저 props 전달 / 컨텍스트로 풀린다. 그래도 안 되면 전역 도입을 별도 결정.

## URL ↔ TanStack Query 의 책임 분리

list 화면이 페이지·필터·정렬을 갖는 경우, **그 값들은 URL**, **결과 데이터는 query**.

```tsx
// GOOD
function PageList() {
  const searchParams = useSearchParams()
  const page = Number(searchParams.get('page') ?? '0')
  const sort = (searchParams.get('sort') ?? 'recent') as SortKey

  const { data } = useQuery(pageListOptions({ page, sort }))
  // ...
}

// BAD — 페이지·필터를 컴포넌트 state 로
function PageList() {
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<SortKey>('recent')
  // 뒤로가기·공유 시 상태가 사라진다
}
```

- URL 변경은 `router.push(?page=...)` — `replace` 는 history 가 안 쌓이므로 뒤로가기 의미가 사라진다. 의도가 명확한 경우만 `replace`.
- `useSearchParams` 가 반환한 값은 모두 string. ID / 숫자 / enum 은 즉시 narrowing (`asPageId(raw)`, `Number(raw)`, literal union 캐스팅).

## 잘못된 동기화 패턴

다음은 모두 잘못된 코드 — `useEffect` 가 신호.

### props → state 동기화

```tsx
// BAD
function PageEditor({ page }: { page: Page }) {
  const [title, setTitle] = useState(page.title)
  useEffect(() => setTitle(page.title), [page.title])
}

// GOOD — derived value 는 렌더 중에 계산
function PageEditor({ page }: { page: Page }) {
  // 표시만 한다면 props 직접 사용
  return <h1>{page.title}</h1>
}

// GOOD — 편집을 위해 로컬 복사가 필요하면 `key` 로 컴포넌트 자체를 reset
<PageEditorForm key={page.id} initialTitle={page.title} />
```

### derived state

```tsx
// BAD
const [items, setItems] = useState(allItems)
const [activeCount, setActiveCount] = useState(0)
useEffect(() => setActiveCount(items.filter((it) => it.isActive).length), [items])

// GOOD
const activeCount = items.filter((it) => it.isActive).length
```

### 이벤트 결과를 effect 로 처리

```tsx
// BAD
const [submitted, setSubmitted] = useState(false)
useEffect(() => {
  if (submitted) {
    router.push('/success')
  }
}, [submitted])

// GOOD — 이벤트 핸들러 안에서 직접
async function handleSubmit() {
  await save()
  router.push('/success')
}
```

## 폼 상태 (현재 표준)

react-hook-form 도입 전까지는 controlled `useState` 로 단순 폼만 다룬다.

```tsx
function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { mutate, isPending, error } = useLogin()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutate({ email, password })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p>{toUserMessage(error)}</p>}
      <Button type="submit" disabled={isPending}>로그인</Button>
    </form>
  )
}

// src/lib/api/errors.ts 같은 공용 위치
function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return '문제가 발생했습니다.'
}
```

- 폼이 3개 필드 이상 + validation 분기가 두 갈래 이상이면 RHF 도입을 별도 검토. 그 전에 들어가면 본 컨벤션 위반.
- validation 메시지는 한국어 존댓말 한 문장 (`conventions.md` "에러 메시지").

## 전역 상태가 필요해 보일 때 — 먼저 의심

"전역이 필요하다" 는 신호 대부분은 다른 원인이다.

| 신호 | 진짜 원인 / 해법 |
|------|----------------|
| 여러 화면이 같은 데이터 (예: 현재 사용자) 가 필요하다 | 서버 데이터다 — TanStack Query 의 캐시가 곧 전역 |
| 깊이 깊은 자식이 부모의 상태를 쓴다 | props 또는 Context. 자식이 깊다고 즉시 전역 아님 |
| 사이드바·헤더·콘텐츠가 동시에 반응해야 한다 | URL 상태로 표현 가능한 경우가 많음 (예: 선택된 탭) |
| Provider 가 너무 많아진다 | `src/app/providers.tsx` 한 파일에 모은다 (`conventions.md`) |

전역 클라이언트 상태 라이브러리 (Zustand 등) 는 위 네 가지 어느 것도 해결 못 하는 경우에만 도입을 결정한다. 그 결정은 별도 티켓 + 본 문서 갱신.

## 자주 빠뜨리는 것

- **`useEffect` 로 props → state 복사** — 거의 항상 derived value 또는 `key` reset 으로 해결.
- **list page / filter 를 컴포넌트 state 로** — 뒤로가기·공유가 깨진다. URL 로.
- **TanStack Query 의 캐시를 컴포넌트 state 로 복사** — 캐시가 두 군데가 되면 동기화가 안 된다. `useQuery` 가 반환한 값을 그대로 쓴다.
- **전역 상태로 "간단하게"** — 한 번 도입되면 디버깅 표면이 늘어난다. 도입 전에 위 4 가지가 안 되는지 한 번 더 본다.
- **URL 값을 string 으로 그대로 흘림** — `useSearchParams` 결과는 모두 string. ID / 숫자 / enum 은 즉시 narrowing.
