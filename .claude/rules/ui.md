# UI 패턴

> **이 문서의 범위**: shadcn primitive 와 wrapping, `cn` 사용, `className` prop 전달, variant, loading / empty / error 상태, button vs link, 접근성.
>
> **컴포넌트 책임·콜로케이션**: `architecture.md`
> **폼 상태**: `state.md`
> **네이밍·타입 일반**: `conventions.md`

## shadcn primitive 와 wrapping

shadcn 가 생성하는 primitive (`Button`, `Card`, `Dialog`, `Input` 등) 는 항상 `src/components/ui/` 에 둔다.

| 상황 | 어떻게 |
|------|--------|
| primitive 의 동작·스타일 미세 조정 | `src/components/ui/<name>.tsx` 직접 수정. 수정 사유를 파일 상단 주석 한 줄 |
| primitive + 도메인 로직 결합 (예: `SubmitButton` 이 loading 상태 자동 처리) | `src/components/SubmitButton.tsx` 같은 wrapping 컴포넌트. primitive 는 그대로 import |
| 한 곳에서만 쓰는 customization | 인라인 — wrapping 컴포넌트로 추출하지 않는다 |

**두 번째 재사용 시점에 wrapping** — 성급한 공통화 지양. 한 곳에서 한 번만 `<Button className="...">` 한다고 즉시 `<SubmitButton>` 으로 추출하지 않는다.

## `cn` 사용

className 결합은 `@/lib/utils` 의 `cn` 만 사용한다. 다른 도구 (`classnames`, `clsx` 직접 호출, 문자열 join) 는 추가하지 않는다 — `cn` 이 이미 `clsx` + `tailwind-merge` 를 묶고 있다.

```tsx
// GOOD
<div className={cn('rounded-md p-4', isActive && 'bg-accent', className)} />

// BAD
<div className={`rounded-md p-4 ${isActive ? 'bg-accent' : ''} ${className ?? ''}`} />
<div className={[base, isActive && 'bg-accent', className].filter(Boolean).join(' ')} />
```

## `className` prop 정책

외부에서 `className` 을 받는 컴포넌트는 항상 **마지막에 머지**한다 — 호출부가 base 스타일을 override 할 수 있어야 한다.

```tsx
type Props = {
  className?: string
  children: React.ReactNode
}

// GOOD — 호출부의 className 이 base 를 이긴다 (tailwind-merge 가 충돌 해결)
function Card({ className, children }: Props) {
  return <div className={cn('rounded-lg border p-4', className)}>{children}</div>
}

// BAD — 호출부 className 이 무시되거나 순서 의존이 깨진다
function Card({ className, children }: Props) {
  return <div className={cn(className, 'rounded-lg border p-4')}>{children}</div>
}
```

- 모든 시각적 컴포넌트는 `className` prop 을 받는 것이 디폴트. 받지 않는 경우는 명확한 사유 (예: 완전히 닫힌 widget) 가 있을 때만.
- `style` prop 전달은 피한다 — Tailwind 로 표현 가능하면 그 쪽으로.

## variant — `class-variance-authority` (cva)

두 갈래 이상의 조건부 class 가 생기면 cva 로 추출한다. shadcn 의 `button.tsx` 가 표준 예시.

```tsx
// GOOD — 의도가 표 형식으로 노출
const buttonVariants = cva('inline-flex items-center justify-center rounded-md', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground',
      outline: 'border border-input bg-background',
    },
    size: {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-base',
    },
  },
  defaultVariants: { variant: 'default', size: 'md' },
})

// BAD — 조건문이 누적되면 추적이 어려워진다
<button
  className={cn(
    'inline-flex ...',
    variant === 'outline' && 'border ...',
    variant === 'default' && 'bg-primary ...',
    size === 'sm' && 'h-8 ...',
    size === 'md' && 'h-10 ...',
  )}
/>
```

- 변형이 1 개 (boolean) 이고 분기가 단순하면 cva 도입 비용이 가치보다 크다 — 인라인 유지.
- VariantProps 로 컴포넌트 props 타입을 합치면 자동 완성이 자연스럽다 — `type Props = VariantProps<typeof buttonVariants> & { ... }`.

## loading / empty / error 세 상태

모든 데이터 의존 화면은 세 상태를 명시 처리한다. TanStack Query 가 셋을 모두 노출하므로 누락은 곧 버그.

```tsx
function PageList({ spaceId }: { spaceId: SpaceId }) {
  const { data, isPending, isError, error } = useQuery(pageListOptions(spaceId))

  if (isPending) return <PageListSkeleton />
  if (isError) return <PageListError message={error.message} />
  if (data.length === 0) return <PageListEmpty />

  return (
    <ul>
      {data.map((page) => (
        <PageListItem key={page.id} page={page} />
      ))}
    </ul>
  )
}
```

- **loading**: Skeleton 우선 (`Skeleton` 컴포넌트), spinner 는 inline action 한정.
- **empty**: 안내 문구 + 다음 행동 (예: "첫 페이지 만들기") 버튼. 비어 있는 그리드만 보이지 않게.
- **error**: 백엔드 `message` 를 우선 노출 (`api-client.md` 의 `ApiError`). 재시도 버튼이 자연스러우면 함께.
- 페이지가 여러 쿼리에 의존하면 셋을 합쳐 처리 — `isPending` 이 하나라도 true 면 skeleton, 에러는 하나라도 있으면 첫 에러 노출.
- **`isPending` vs `isFetching`** — TanStack Query v5 에서 초기 로드는 `isPending` (데이터 없음 + 로딩 중), 재요청 (refetch, polling, invalidation 후 재요청) 중은 `isFetching`. 첫 진입 skeleton 은 `isPending`, 부분 갱신 인디케이터 (목록 위 상단 progress bar 등) 가 필요할 때만 `isFetching`.

## 도메인 fallback 라벨

BE 스키마가 *비어 있을 수 있는 도메인 값* 을 빈 문자열 (`""`) 로 내려보내는 필드가 있다. 가장 흔한 예가 `authorHandle` — 작성자가 삭제되면 BE 가 빈 문자열로 표시.

- **빈 문자열 → 한국어 fallback 라벨** 로 렌더 (`삭제된 사용자`, `이름 없는 스페이스` 등). raw `""` 또는 `@` 만 노출되는 회귀를 막는다.
- 라벨은 `italic` (시각적으로 *대체 표시* 임이 드러나게), 평소 표기 (예: `@handle`) 의 prefix (`@`) 는 떼고 라벨 단어만.
- 같은 fallback 분기가 두 곳 이상에 등장하면 (PageReadingView 메타 줄, 인바운드 link row 등) 본 룰을 invariant 로 인용 — 컴포넌트 안 주석으로 두지 않는다.

```tsx
// GOOD
{source.authorHandle === "" ? (
  <span className="italic">삭제된 사용자</span>
) : (
  <span className="text-accent-secondary">@{source.authorHandle}</span>
)}
```

falsy 전체 (`null` / `undefined` 포함) 가 아니라 *빈 문자열만* 분기하는 게 핵심 — BE 가 명시적으로 "" 로 표기한다는 계약 (schema description) 에 정합. nullable 가 새로 생기면 그때 분기를 늘린다.

## button vs link

- 라우팅이면 `<Link>` (next/link). 페이지를 바꾼다 = link.
- 액션 (mutation, dialog open, state toggle) 이면 `<Button>` (shadcn).
- 시각이 button 인데 라우팅이 필요하면 본 레포 Button (base-ui 기반) 의 `render` prop 으로 합친다 — shadcn `asChild` 등가.

```tsx
<Button nativeButton={false} render={<Link href="/spaces">스페이스 둘러보기</Link>} />
```

`nativeButton={false}` 가 빠지면 `<button><a/></button>` 으로 nested 렌더되어 hydration mismatch 가 난다 — base-ui 가 기본으로 `<button>` 을 가정하기 때문. Link 처럼 비-button element 로 교체할 때 항상 `nativeButton={false}` 동반.

- 우클릭 컨텍스트 메뉴 (새 탭 열기, 링크 복사) 가 필요하면 반드시 `<Link>`. `<Button onClick={() => router.push(...)}>` 는 접근성·UX 둘 다 손해.

## 접근성

base-ui / shadcn 가 기본 제공하는 것과 직접 확인할 것을 구분.

| 위젯 | base-ui / shadcn 가 제공 | 직접 확인 |
|------|--------------------------|----------|
| Dialog | focus trap, `aria-modal`, escape 닫기 | 트리거에 의미 있는 label, 닫힐 때 focus 복귀 위치 |
| Menu / Dropdown | `role=menu`, `aria-expanded`, 키보드 nav | 트리거 label, 아이콘만 있는 트리거에 `aria-label` |
| Form input | label 슬롯, error 슬롯 | label 과 input 의 `htmlFor` ↔ `id` 연결, error 메시지의 `aria-describedby` |
| Tooltip | `role=tooltip`, hover/focus 트리거 | tooltip 만으로 정보 전달 금지 (모바일 / 키보드에서 안 보임) |

- 이미지·아이콘만 있는 버튼은 항상 `aria-label`.
- color 만으로 의미를 표현하지 않는다 (에러는 빨강 + 텍스트 + 아이콘 같이).
- 키보드 nav 회귀: `Tab` 으로 모든 인터랙티브 요소에 도달 가능한지 한 번 손으로 돌려본다.

## 자주 빠뜨리는 것

- **`className` 을 prop 으로 안 받음** — 호출부에서 spacing / margin 한 줄 더할 수 없게 됨. wrapping 컴포넌트는 거의 항상 `className` 받는다.
- **`cn(className, 'base')`** 순서 잘못 — base 가 호출부 className 을 이긴다. 항상 base 먼저, className 마지막.
- **shadcn primitive 를 그대로 두고 wrapping 도 안 만들면서 매 사용처에서 동일한 className 반복** — 두 번째 등장에서 wrapping.
- **loading 을 spinner 로만 처리** — 레이아웃이 튀어 보기 흉하다. Skeleton 으로 자리 잡기.
- **빈 상태에 빈 화면** — "아직 없습니다" 한 줄도 없이 비어 있으면 로딩 중인지 비어 있는지 사용자가 모른다.
