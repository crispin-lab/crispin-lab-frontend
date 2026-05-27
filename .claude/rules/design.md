# 디자인 방향

> **이 문서의 범위**: 시각 방향 — 색의 *역할*, 폰트, 톤, light/dark, 두 사용자 그룹의 레이아웃 골격, shadcn primitive 도입 시점.
>
> **primitive wrapping / cn / variant / 접근성**: `ui.md`
> **디렉토리 구조 / 라우팅 / 컴포넌트 책임**: `architecture.md`
> **본문 (TipTap 에디터) 의 시각**: `editor.md`
> **화면별 와이어프레임 산출물**: `../design/wireframes.md` (룰이 아닌 산출물 인덱스)

## 정체성 — 공개 위키 first

`crispin-lab` 은 *공개 위키* 가 1순위, *저자 워크스페이스* 가 2순위. 시각 결정의 기준은 다음 정신을 따른다:

- **첫 진입자 = 비특정 다수의 방문자** (공유 링크 / 검색 엔진 / 공개 인덱스). 이들에게 *글을 잘 읽히게* 하는 게 1차 기준.
- **저자 (사용자 본인)** 는 별도 인증 경로 (`/login`) 로 진입. 편집·관리 환경은 *workspace tool* 의 관습 (좌 사이드바 트리 등) 을 따른다.

두 그룹은 시각·레이아웃·진입 경로가 다르다 (아래 *두 사용자 그룹* 절). 본 룰은 두 path 모두를 다루되 *방문자 path 가 디폴트* 로 가정한다.

## 방향 vs 토큰

본 문서는 *어떤 색이 어떤 역할을 하는가* 만 박는다. 픽셀 단위 oklch 값·간격 스케일·새 색 추가 같은 *토큰 결정* 은 본 문서가 다루지 않는다. shadcn/ui 의 CSS 변수 (`src/app/globals.css` 의 `:root` / `.dark`) 가 토큰의 단일 출처이고, 부족할 때만 추가한다.

## 톤 — reading-first 미니멀

긴 글을 *비특정 다수가 처음* 만나는 형식. 가독성·신뢰 신호·정보 발견이 핵심.

- **본문 가독성 우선** — 한 줄 80~90자 (`max-w-2xl` ~ `max-w-3xl`), generous line-height (`leading-7`), 충분한 side padding.
- **신뢰 신호 노출** — 저자 / 발행 날짜 / 마지막 수정 / visibility (PUBLIC/INTERNAL/PRIVATE) 가 본문 위에. 출처 불명의 글로 보이지 않게.
- **정보 발견 도구** — 검색 input 이 메인 nav 의 일부, TOC 는 우측 (긴 글에서), 인바운드 links (`[[페이지명]]` 으로 본 페이지를 가리키는 다른 페이지) 가 본문 하단.
- **장식 최소** — 색·그라데이션·일러스트는 *정보 위계* 가 명확할 때만. Substack · 개인 블로그 · MDN 톤을 참고하되 workspace tool 의 정보 밀도는 *저자 path* 에 한정.

## 두 사용자 그룹

| 그룹 | 진입 경로 | 시각 레이아웃 | 주요 인터랙션 |
|------|----------|--------------|-------------|
| **방문자** | root `/` · `/pages/[pageId]` (공유 링크) · `/search` (검색 엔진) | **본문 중심**, 좌 사이드바 없음. 상단 thin app bar (검색·로그인 link) + 본문 max-w ~720px + 옵션 우측 TOC | reading · 검색 · `[[페이지명]]` 클릭 · 가입 권유 |
| **저자** | `/login` → 인증 후 root 또는 직전 페이지 | **좌 사이드바 + 본문** (workspace tool 패턴). 사이드바에 페이지 트리, 본문에 편집 모드 | 편집 · 저장 · 트리 정리 · visibility 변경 |

같은 URL (`/pages/[pageId]`) 이 두 가지 mode 를 가진다:

- *방문자 mode* (비로그인 또는 비편집 권한): 본문 중심 reading, 사이드바 없음.
- *저자 mode* (편집 권한): 좌 사이드바 + 편집 도구. URL 은 동일, 권한·인증 상태로 분기 (구현 결정은 `auth.md` 와 첫 화면 구현 PR).

## 색 역할 — neutral 회색 + violet accent

`components.json` 의 `baseColor: "neutral"` 이 회색 계조의 단일 출처. shadcn `style` 은 `base-nova` (현재 `components.json`) — 별도 변형 추가 시 본 문서 갱신.

| CSS 변수 | 의도 | 어디서 쓰나 |
|----------|------|------------|
| `--background` / `--foreground` | 화면 전체 배경·기본 글자 | body 기본 |
| `--primary` / `--primary-foreground` | 가장 중요한 액션 (form 제출, 핵심 CTA) | Button default |
| `--secondary` / `--secondary-foreground` | 보조 액션 | Button secondary |
| `--muted` / `--muted-foreground` | 약한 표면·부가 정보 (메타·인디케이터·placeholder) | meta 텍스트, 비활성 |
| `--accent` / `--accent-foreground` | **violet 강조** — 현재 페이지 / `[[페이지명]]` chip / primary 가 아닌 CTA | active nav, 위키 링크 (PageLink 노드 시각은 `editor.md` 의 *렌더링* 절 참조) |
| `--destructive` | 파괴적 액션 (삭제·영구 제거) | confirm dialog |
| `--border` / `--input` / `--ring` | 분리선·입력 outline·focus ring | 모든 입력 요소 |
| `--sidebar*` | 좌 사이드바 전용 토큰 (저자 path 한정) | 사이드바 컴포넌트만 |

- `primary` 는 **neutral 유지** — 모든 화면에서 가장 흔한 액션이라 진폭이 강하지 않게.
- `accent` 는 **violet 으로 교체 예정**. 현재 `globals.css` 의 `--accent` 는 light `oklch(0.97 0 0)` / dark `oklch(0.269 0 0)` 로 같은 모드 `--muted` 와 동일 값이라 강조 역할을 못 하고 있다. violet 의 실제 oklch 값 교체는 *첫 화면 구현 PR* 에서 같은 PR 로 (light/dark 양쪽 시각 검증과 함께). 본 문서는 *방향* 만 박는다.
- **색 하드코딩 금지** — `bg-violet-600` / `text-zinc-500` 같은 raw 팔레트 className 을 컴포넌트에 쓰지 않는다. 의미 변수 (`bg-accent` / `text-muted-foreground`) 로.

## light 1순위 + dark 옵션

**light 가 기본**. dark 는 *방문자 선호 + 저자 야간 작업* 위한 옵션 토글.

- 긴 글 reading 의 일반 관습은 light (Substack · Medium · MDN · Wikipedia 모두). 본 프로젝트의 *공개 위키 first* 정체성과 정합.
- 저자 path (편집 모드) 는 dark 가 자연스러울 수 있어 토글 위치는 app bar 안 또는 사용자 메뉴.
- `.dark` class 를 토글하는 provider 는 아직 없음 — 첫 화면 구현 PR 에서 `next-themes` 도입 검토.
- 새 색·새 토큰을 도입할 때 `:root` (light) 와 `.dark` 양쪽에 값을 넣는다. 한쪽만 넣으면 다른 모드에서 가독성이 깨진다.
- 시각 검증·디자인 결정은 **light 부터** (방문자 path 의 일반 경험). 그 다음 dark.

## 타이포 — Geist Sans / Geist Mono

`src/app/layout.tsx` 에서 `next/font/google` 로 `Geist`, `Geist_Mono` 가 import 되어 `--font-geist-sans` / `--font-geist-mono` 변수로 주입된다.

- className 으로는 `font-sans`, `font-mono` 만 사용. 직접 `font-family: "Geist"` 류 선언 금지 — 토큰 우회.
- **heading hierarchy 명확** — h1 `text-3xl` / h2 `text-2xl` / h3 `text-xl` / h4 `text-lg` 기준. reading 환경에선 위계가 본문 탐색에 직접 영향.
- **본문 line-height 넉넉히** — `leading-7` 또는 `leading-relaxed` 가 reading 정합. workspace tool 의 `leading-6` 보다 한 단계 위.
- heading 도 `font-sans` (`globals.css` 에서 `--font-heading: var(--font-sans)`). heading 만 다른 family 로 가지 않는다.
- mono 는 코드·식별자 (`PageId` 같은 도메인 ID)·키 명령어 표기에 한정. 본문 강조에 쓰지 않는다.
- **현재 wiring 결함 (후속 PR 정리 대상)**: `globals.css:10` 의 `--font-sans: var(--font-sans)` 가 self-reference 라 `layout.tsx` 가 주입한 `--font-geist-sans` 가 `--font-sans` 로 연결되지 않는다. 첫 화면 구현 PR 또는 별도 chore PR 에서 `--font-sans: var(--font-geist-sans)` 로 교체하면 본 절의 전제가 만족된다.

## 레이아웃 골격

### 방문자 path (디폴트)

```
┌──────────────────────────────────────────────────────────┐
│  top app bar (thin · 검색 · 로그인 link)                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│              본문 (max-w ~720px · side padding             │
│               넉넉히 · 한 줄 80~90자)                       │
│                                                          │
│              (긴 글이면 우측에 좁은 TOC option)            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- 좌 사이드바 **없음**. 탐색은 검색·인바운드 links·TOC 로.
- 본문 폭 `max-w-2xl` ~ `max-w-3xl`.
- 우 TOC 는 옵션 — heading 3개 이상이거나 본문 길이 일정 이상일 때만 표시.

### 저자 path (workspace mode)

```
┌──────────────────────────────────────────────────────────┐
│  top app bar (검색 · 계정 · 테마 토글)                    │
├────────────┬─────────────────────────────────────────────┤
│            │                                             │
│  좌 사이드바 │  본문 (편집 모드 — max-w 동일 ~720px)        │
│  (페이지 트리)│                                            │
│            │                                             │
└────────────┴─────────────────────────────────────────────┘
```

- 좌 사이드바 폭 `~240~280px`. 페이지 트리 (parentPageId 로 재구성 — 백엔드 정합 메모 참조).
- 본문 폭은 방문자 path 와 동일 — 한 글이라 본문 가독성은 모드 무관.
- 화면별 구체 배치는 `../design/wireframes.md` — 본 룰은 *모든 화면에 공통* 되는 골격만.

## 간격·반경·shadow

- `--radius` (현재 `0.625rem`) 가 단일 출처. shadcn 의 `rounded-sm` ~ `rounded-4xl` 사다리 그대로. 새 반경 스케일을 만들지 않는다.
- 간격은 Tailwind 기본 스케일. 새 간격을 만들기 전에 기존 스케일로 풀리는지 본다.
- shadow 는 **elevation 두 단계만**. surface (card 등) 는 `shadow-sm`. popover · dialog 는 shadcn primitive 의 디폴트 shadow 그대로 — 단계의 실제 값 정의는 dialog/popover primitive 도입 PR 에서.

## 아이콘 — lucide 고정

`components.json` 의 `iconLibrary: lucide`. 다른 아이콘 셋 (heroicons · tabler 등) 혼용 금지. lucide 에 없는 아이콘이 필요하면 의미가 정말 다른 아이콘인지 검토 후 별도 결정.

## shadcn primitive 추가 시점

본 룰의 책임: *언제 primitive 를 늘릴지* (시각 결정). `ui.md` 의 책임: *어떻게 wrap 할지*.

- 와이어프레임 단계에서 새 위젯이 *두 번째* 화면에 등장하면 `pnpm dlx shadcn add <name>` 으로 정식 추가.
- 한 화면에만 등장하는 위젯은 **인라인 모킹 금지** — 그 화면 안에서 작은 컴포넌트로 만들고 두 번째 등장 시 primitive 로 승격.
- primitive 추가 결과는 `src/components/ui/` 에만.

## accent 사용 한도

violet accent 는 **한 화면에 1~2 군데** 가 상한 — 현재 페이지 표시 / `[[페이지명]]` chip / 보조 CTA 정도. 강조가 늘면 강조가 약해진다.

- 방문자 path 의 *primary CTA* (예: 가입 권유) 는 `--primary` (neutral) 가 자연스럽다 — 본문이 글이므로 violet 이 본문보다 강하면 시선 분산.
- 저자 path 의 *현재 페이지* 사이드바 active 와 본문 위키 chip 이 같이 등장하면 그 두 개가 본 화면 accent 한도.

## Before / After

### 색 하드코딩 → 토큰

```tsx
// BAD
<button className="bg-violet-600 text-white hover:bg-violet-700">

// GOOD
<button className="bg-accent text-accent-foreground hover:bg-accent/90">
```

### dark 미고려 → 토큰 자동

```tsx
// BAD — light 만 잡고 dark 가 깨짐
<div className="bg-zinc-50 text-zinc-900">

// GOOD — 토큰이 dark 자동 대응
<div className="bg-background text-foreground">
```

### 방문자 path 에 사이드바 잘못 추가

```tsx
// BAD — 공유 링크로 들어온 방문자에게 페이지 트리는 noise
function PublicPage() {
  return (
    <div className="grid grid-cols-[280px_1fr]">
      <PageTreeSidebar />
      <Article />
    </div>
  );
}

// GOOD — 본문 중심, 사이드바 없음. 탐색은 검색·인바운드 links 로
function PublicPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Article />
    </main>
  );
}
```

## 자주 빠뜨리는 것

- **방문자 path 에 저자 UI 가 흘러듦** — 좌 사이드바·편집 toolbar·페이지 트리는 *저자 mode* 한정. 비로그인 방문자에게 보이면 *나만의 노트* 같은 인상.
- **dark-first 가정** — 본 프로젝트는 light-first. 컴포넌트가 `bg-zinc-900 text-white` 같은 dark 가정 className 을 박지 않는다. 토큰 (`bg-background text-foreground`) 로 자동 분기.
- **신뢰 신호 누락** — 방문자가 들어왔는데 저자·날짜·visibility 가 없으면 *출처 불명* 의 글. 페이지 상세는 본문 위에 메타 한 줄 필수.
- **accent 남용** — 한 화면에 violet 이 3 곳 이상이면 강조가 사라진다. 1~2 군데가 상한. 본문이 글인 reading 환경에선 1 곳이 더 자연스러움.
- **dark 값 누락** — `:root` (light) 에만 새 토큰 추가하고 `.dark` 잊음. 양쪽 동시 추가.
- **본문 너비 무시** — `max-w-2xl` / `max-w-3xl` 누락하면 와이드 모니터에서 한 줄 120자 넘어 reading 회귀.
- **`globals.css` 외 위치에 색 하드코딩** — 의미 변수 (`bg-accent` / `text-muted-foreground`) 로.
- **`font-family` 직접 선언** — `style={{ fontFamily: 'Geist' }}` / CSS 의 `font-family: 'Geist'` 는 토큰 우회. `font-sans` / `font-mono` 유틸만.
- **와이어프레임 단계에서 primitive 인라인 모킹** — 같은 위젯이 두 번째 화면에 등장한 *후* shadcn add.
- **`dark:` 분기를 컴포넌트에 박음** — 토큰이 의미 변수면 dark 분기는 자동. 컴포넌트 안 `dark:bg-...` 가 보이면 토큰화로 풀리는지 다시 본다.
- **TOC 를 모든 화면에 박음** — 본문 길이·heading 개수가 일정 이상일 때만. 짧은 페이지에 TOC 가 등장하면 reading 의 시각 무게가 흐려진다.
