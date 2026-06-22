# 에디터 (TipTap)

> **이 문서의 범위**: TipTap 기반 본문 에디터의 확장 구성, `[[페이지명]]` 위키 참조 입력/렌더, 저장 포맷.
>
> **백엔드 모델 정합**: `crispin-lab-backend` 의 `PageLink` 모델 — `(targetPageId: PageId, displayText: String)` 구조.
> **컴포넌트 책임 분리**: `architecture.md`

## 스택

- `@tiptap/react` — React 바인딩
- `@tiptap/core`, `@tiptap/pm` — 커스텀 노드 (callout / details / footnote) 정의용
- `@tiptap/starter-kit` — 기본 노드/마크 (paragraph, heading, bold, italic, code, list 등)
- `@tiptap/extension-mention` — `[[...]]` 위키 참조의 베이스
- `@tiptap/extension-code-block-lowlight` + `highlight.js` + `lowlight` — 코드 블록 + syntax highlighting (현재 16 언어 + mermaid passthrough)
- `@tiptap/extension-table` (+ row / header / cell) — 표
- `@tiptap/extension-task-list` + `@tiptap/extension-task-item` — 체크리스트
- `@tiptap/extension-mathematics` + `katex` — 수식 (inline / block)
- `@tiptap/suggestion` — slash 명령 메뉴 베이스
- `mermaid` — 다이어그램 (코드 블록 언어 mermaid 로 트리거, 클라이언트 동적 import)

확장은 starter-kit 외에는 **도메인 요구가 명확할 때만 추가**한다. 시작 시점에 모든 마크를 켜두지 않는다.

## 저장 포맷 — JSON 채택

TipTap 의 `editor.getJSON()` 산출물 (`JSONContent`) 을 그대로 저장한다.

### 이유

- **노드 메타데이터 보존**: `[[페이지명]]` 노드는 `data-page-id` 같은 attribute 를 갖는다. HTML 직렬화 시 unknown attr 가 살아남는지 확장마다 다르고, 백엔드의 `PageLink(targetPageId, displayText)` 와의 매핑이 깨질 위험.
- **마이그레이션 유리**: 노드 구조가 명시 트리라 새 확장 도입 / 노드 이름 변경 시 트리 transform 으로 일괄 처리 가능.
- **백엔드 정합**: 백엔드가 본문을 단순 BLOB 으로 보관하더라도, 위키 링크 인덱싱 (`PageLink` 추출) 시 JSON 이 HTML 파싱보다 안전.

### 호환성 메모

HTML 렌더링이 필요한 곳 (예: 백엔드 검색 인덱스용 plain text 추출, SSR 미리보기) 은 `generateHTML(json, extensions)` 로 필요 시점에 변환한다. 저장 시점에는 변환하지 않는다.

## 본문 컴포넌트 위치

```
src/components/editor/
  Editor.tsx              # useEditor 셋업 + 확장 wiring (Client Component)
  BubbleMenu.tsx          # 선택 시 떠오르는 mark toolbar
  MentionList.tsx         # pageLink suggestion 의 dropdown UI
  extensions/
    editor.ts             # 편집 모드 확장 레지스트리 (factory)
    viewer.ts             # 읽기 모드 확장 레지스트리 (static array, React 의존 0)
    pageLink/             # [[페이지명]] 위키 참조
    codeBlock/            # 코드 블록 + lowlight + mermaid raw passthrough
    table/                # 표 (table / row / header / cell)
    taskList/             # 체크리스트 (task-list + task-item)
    callout/              # info / warn / tip 박스 — custom Node
    details/              # 접기/펴기 — custom (details / summary / content)
    math/                 # KaTeX inline / block
    footnote/             # reference / item / list + numbering plugin
    slashMenu/            # `/` 명령 메뉴 + items 레지스트리
```

viewer 측 클라이언트 hydrator (rendered HTML 후처리, `src/app/(app)/pages/[pageId]/_components/`):

- `PageLinkChipNavigator` — 위키 chip 의 click/Enter 위임
- `CodeBlockCopyMounter` — `<pre>` 에 복사 버튼 부착
- `MermaidMounter` — `<pre data-mermaid="true">` 를 SVG 로 hydrate (mermaid 동적 import)
- `KatexMounter` — `[data-type="inline-math|block-math"]` 를 KaTeX HTML 로 hydrate

- `Editor.tsx` 는 Client Component (`'use client'`). TipTap 은 브라우저 전용.
- 모든 확장은 `extensions/<name>/index.ts` (editor) + `<name>/viewer.ts` (viewer) 한 쌍 — viewer 가 React 를 끌어오지 않도록 분리. `pageLink/node.ts` 처럼 노드 spec 자체는 공유, viewer 가 renderHTML 만 덮어쓰는 패턴.

## `[[페이지명]]` 위키 참조 — Mention 확장

TipTap 의 `@tiptap/extension-mention` 을 베이스로 한 custom node. trigger 문자를 `@` → `[[` 로 바꾸고 suggestion 을 페이지 검색 API 에 연결한다.

### 입력 흐름

1. 사용자가 본문에서 `[[` 입력
2. Mention 확장의 `suggestion` 가 dropdown 표시, 입력어로 백엔드 페이지 검색 API 호출 (`apiFetch('/api/pages?query=...')`)
3. 결과 중 하나 선택 → 본문에 `PageLink` 노드 삽입 (`{ type: 'pageLink', attrs: { pageId: 'p_xxx', displayText: '선택한 페이지명' } }`)
4. 닫는 `]]` 는 입력하지 않아도 노드 삽입으로 종결 (mention 의 일반적 UX)

### 노드 attribute 와 백엔드 매핑

| TipTap node attr | 백엔드 `PageLink` | 비고 |
|------------------|-------------------|------|
| `attrs.pageId` (string) | `targetPageId: PageId` | 응답 디코딩 시 `asPageId(...)` (`api-client.md`) |
| `attrs.displayText` (string) | `displayText: String` | 사용자가 본 텍스트. 백엔드는 알림·검색 등에 사용 |

- `attrs.pageId` 는 **불변**. 사용자가 노드의 표시 텍스트를 편집해도 pageId 는 유지된다. 변경하려면 노드를 지우고 다시 삽입.
- 노드 입력/렌더링 시 pageId 의 zod 검증은 mention command 가 호출되는 경계에서 한 번 (`api-client.md` 의 ID 정책 정합).

### 렌더링

- 에디터 내부: `NodeViewWrapper` 로 chip 스타일 inline span (`<span data-page-id="...">{displayText}</span>`).
- 에디터 밖 (뷰어): `generateHTML` 산출물의 `data-page-id` 를 후처리로 Client 컴포넌트 `PageLinkRenderer` 로 hydrate, 클릭 시 `router.push('/pages/{pageId}')`.
- 또는 같은 TipTap 확장으로 read-only editor 를 띄우는 패턴도 검토 — 클릭 핸들러를 한 곳에 모으기 쉽다. 시작 시점엔 read-only TipTap 으로.

## 검색 suggestion 의 디바운스 / 캐시

- mention suggestion 의 query 는 **300ms 디바운스**. 매 키 입력마다 백엔드를 두드리지 않는다.
- 같은 query 가 반복되면 TanStack Query 의 `staleTime: 30_000` 으로 캐시 (`api-client.md` 의 staleTime 가이드).
- 결과가 0 개일 때 "새 페이지 만들기" 옵션 — 도입 시점에 결정. 본 룰 문서에 추가 절로.

## 페이지 본문 저장 / 불러오기

### 저장

```ts
function PageEditor({ initialContent }: { initialContent: JSONContent }) {
  const editor = useEditor({
    extensions: [StarterKit, Link, PageLink],
    content: initialContent,
  })

  const { mutate: save } = usePageSave()
  const handleSave = () => {
    if (!editor) return
    save({ content: editor.getJSON() })
  }
  // ...
}
```

- 저장 페이로드의 `content` 필드는 `JSONContent` 타입. 백엔드는 이를 그대로 받아 보관 + `PageLink` 노드만 추출해 별도 테이블에 인덱싱.
- **자동 저장** (draft 보존) 정책은 별도 결정. 도입 시점에 본 문서에 추가.

### 불러오기

- 백엔드는 `content: JSONContent` 그대로 응답.
- Server Component 에서 받아 `<PageEditor initialContent={page.content} />` 로 전달.

## 새 노드 attrs 정의 (라운드트립 invariant)

본문 round-trip (저장 → 불러오기 → 동일 트리) 이 깨지지 않도록 attrs 정의는 본 표 기준으로 고정. 변경 시 본 문서 + viewer.ts + 라운드트립 테스트 한 묶음으로.

| 노드 | attrs | parseHTML | renderHTML |
|------|-------|-----------|------------|
| `callout` | `kind: 'info' \| 'warn' \| 'tip'` (기본 `info`, 알 수 없는 값은 `info` 로 fallback) | `div[data-callout]` 의 `data-kind` 읽음 | `<div data-callout data-kind="...">` |
| `details` | `open: boolean` (기본 `false`) | `<details>` 의 `open` attribute 유무 | `<details open?>` |
| `detailsSummary` | 없음 | `<summary>` | `<summary class="details-summary">` |
| `detailsContent` | 없음 | `<div data-details-content>` | 동일 |
| `footnoteReference` | `number: number` (1+, 정수 강제, default 1) | `<a data-footnote-ref>` 의 `data-number` 읽음 | `<a data-footnote-ref href="#fn-N" data-number="N">[N]</a>` |
| `footnoteItem` | `number: number` (정수 강제, default 1) | `<li data-footnote-item>` 의 `data-number` 읽음 | `<li data-footnote-item id="fn-N" data-number="N">` |
| `footnoteList` | 없음 | `<ol data-footnotes>` | `<ol data-footnotes class="footnote-list">` |
| `inlineMath` / `blockMath` | `latex: string` | `[data-type="inline-math|block-math"]` 의 `data-latex` | 빈 wrapper (KatexMounter 가 hydrate) |
| `codeBlock` | `language: SupportedLanguage` (16 종 + `text` + `mermaid`) | 기존 spec + 새 언어 인식 | `<pre class="hljs language-...">` 또는 mermaid 는 `<pre data-mermaid="true">` |
| `table` / `tableRow` / `tableHeader` / `tableCell` | 공식 spec 그대로 | 공식 | 공식 |
| `taskList` / `taskItem` | 공식 (`checked: boolean` on item) | `ul[data-type="taskList"]` / `li[data-type="taskItem"][data-checked]` | 동일 |

### 빠지기 쉬운 priority 함정

`footnoteReference` (`<a data-footnote-ref>`), `footnoteList` (`<ol data-footnotes>`), `footnoteItem` (`<li data-footnote-item>`) 는 StarterKit 의 Link / OrderedList / ListItem 과 같은 tag 를 점유한다. parseHTML 의 `priority: 100` 으로 우선권을 확보 — 본 값을 낮추면 round-trip 이 깨진다.

## slash 명령 메뉴 (`/`)

- 베이스: `@tiptap/suggestion`, trigger `'/'`, `startOfLine: false`, `allowSpaces: false`.
- items 는 정적 배열 (`extensions/slashMenu/items.ts` 의 `SLASH_ITEMS`) — 디바운스 / 백엔드 호출 없음. pageLink 의 검색 suggestion 과 다름.
- 각 item.command 는 `editor.chain().focus().deleteRange(range).<action>().run()` 패턴 — slash 입력 흔적을 동일 chain 으로 제거.
- 매칭은 label / key / keywords 부분 일치 (대소문자 무시). 검색이 0 건이면 "일치하는 명령이 없습니다." 안내만, 새 항목을 자동 생성하지 않는다.
- 키보드: ArrowUp/Down 순환, Enter 선택, Escape 닫기. SlashMenuList 는 MentionList 의 imperative-handle 패턴 그대로.
- 새 명령을 추가하려면 `items.ts` 한 곳만 — 본 룰 문서 표 (아래 "현재 등록 명령") 도 같이 갱신.

### 현재 등록 명령

paragraph / heading 1-3 / bullet list / ordered list / task list / blockquote / code block / table / callout (info / warn / tip) / math block / mermaid / footnote / details / horizontal rule.

## Mermaid 렌더링

- 본 프로젝트는 mermaid 를 **별도 노드가 아니라 code block 의 language="mermaid"** 로 다룬다.
- viewer 의 `viewerCodeBlock.renderHTML` 이 mermaid 언어를 `RAW_PASSTHROUGH_LANGUAGES` 로 분기 — hljs 적용을 skip 하고 raw text + `data-mermaid="true"` 만 출력.
- `MermaidMounter` 가 클라이언트에서 `[data-mermaid="true"] code` 를 찾아 mermaid 동적 import 후 SVG 로 치환.
- editor 모드의 `CodeBlockNodeView` 는 mermaid 언어일 때 미리보기/원본 토글을 노출 (눈 / 연필 아이콘). 미리보기 모드도 `NodeViewContent` 는 hidden 유지 — ProseMirror 가 본문 텍스트를 잃지 않게.
- mermaid lib (~700KB) 은 본 페이지 초기 번들에 들어가지 않게 항상 **동적 import**.

## KaTeX (수식) 렌더링

- inline math (`$x^2$`) / block math (`$$ \\int x dx $$`) 모두 `@tiptap/extension-mathematics` 의 input rule 로 생성.
- 노드 자체는 `data-latex` attribute 만 가지는 빈 wrapper. KaTeX 렌더는:
  - editor 모드 — extension-mathematics 의 NodeView (client) 가 동기 처리.
  - viewer 모드 — `KatexMounter` 가 `[data-type="inline-math"]`, `[data-type="block-math"]` 를 찾아 `katex.renderToString` 으로 hydrate.
- `katex.min.css` 는 `src/app/layout.tsx` 에서 한 번 import — SSR 단계에 link tag 가 박혀 layout shift 회피.
- `throwOnError: false` — 잘못된 LaTeX 는 빨간 raw 텍스트로 표시되고 본문 흐름은 깨지 않는다.

## 각주 (footnote) 번호 매김

- `FootnoteNumbering` 은 ProseMirror plugin (`appendTransaction`) 으로, **transaction 의 docChanged 가 true** 일 때만 발화.
- 문서 안의 `footnoteReference` 등장 순서대로 1, 2, 3, ... 을 number 로 부여. `footnoteList` 안의 `footnoteItem` 도 같은 순서로 동기.
- 무한 루프 방어: 현재 number 와 desired 가 모두 일치하면 `setNodeMarkup` 을 호출하지 않아 `tr.steps.length` 가 0 — `appendTransaction` 이 null 반환.
- viewer 는 plugin 을 등록하지 않는다 — 저장된 number 가 이미 plugin 의 결과라 그대로 노출.
- reference 추가/삭제 시 list 의 item 자동 생성/삭제는 본 PR 범위 외 — 사용자가 본문 끝에서 직접 list 를 만들고 item 을 채운다 (slash 메뉴 또는 manual).

## 콜아웃 / details 시각

- callout: `--accent` (info), `--destructive` (warn), `--accent-secondary` (tip) 의 옅은 (8%) 표면 + 4px 좌측 보더. accent 한도 (`design.md`) 정신 유지 — 한 화면 1~2 곳을 넘기지 않게.
- details: native `<details>` + `<summary>` 사용. 클릭 토글은 브라우저가 처리하지만 `open` attr 가 ProseMirror 의 `parseHTML` 통해 JSON 에 보존된다.
- 두 노드 모두 NodeView 를 두지 않는다 — prose CSS (`src/styles/code-highlight.css` 의 `.prose-page .callout` / `.prose-page .details`) 가 시각 책임.

## 자주 빠뜨리는 것

- **`@tiptap/extension-mention` 의 default trigger `@` 를 그대로 사용** — 본 프로젝트는 `[[` 가 위키 링크 트리거. mention 의 `suggestion.char` 를 `[[` 로 명시.
- **에디터를 Server Component 에서 렌더 시도** — TipTap 은 `window` 의존. 반드시 Client Component.
- **`editor.getHTML()` 로 저장** — 위키 링크 attribute 가 깨질 수 있다. 항상 `getJSON()`.
- **새 확장 추가 시 viewer 와 sync 안 함** — Editor 와 Viewer 가 다른 확장 set 을 쓰면 같은 JSON 이 다르게 렌더된다. 확장 list 를 한 module 로 export 해 양쪽에서 import.
- **입력 디바운스 없음** — mention suggestion 이 매 키마다 API 를 두드리면 백엔드 부하 + 응답 race. 디바운스 필수.
- **footnote parseHTML 의 priority 누락** — 같은 tag 를 StarterKit 마크가 점유한다 (`<a>`, `<ol>`, `<li>`). `priority: 100` 명시.
- **mermaid 를 SSR 에서 import 시도** — mermaid 는 client-only. 동적 import 를 `'use client'` 컴포넌트의 `useEffect` 안에서만.
- **KaTeX CSS 를 컴포넌트별로 import** — `layout.tsx` 에서 한 번. 컴포넌트별로 박으면 같은 stylesheet 가 N 번 들어가 layout shift / 번들 낭비.
- **footnote numbering plugin 의 `appendTransaction` 가 항상 새 transaction 반환** — `tr.steps.length` 가드 누락 시 무한 루프. desired === current 면 null 반환해야 한다.
- **slash 메뉴 item 이 deleteRange 누락** — `/` 입력 흔적이 본문에 남아 사용자가 수동 삭제해야 한다. 모든 item.command 가 `editor.chain().focus().deleteRange(range).<action>().run()` 패턴 강제.
- **codeBlock language 추가 시 SUPPORTED_LANGUAGES 와 lowlight.register 한쪽만 수정** — UI 에는 보이는데 색칠 안 됨 (또는 반대). 두 곳 같이 갱신, `lowlight.test.ts` 의 `lowlight.registered("...")` 단언으로 가드.
- **details 의 open 토글이 저장되지 않음** — 사용자가 native `<details>` 를 클릭해 열어도 ProseMirror 가 모르면 다음 save 시 false 로 돌아간다. 현재는 slash 가 `open: true` 로 삽입하는 정책으로 회피 (NodeView 의 'toggle' 이벤트 listener 는 후속 PR).
- **ResizeObserver 미스텁** — TipTap table NodeView 가 jsdom 테스트에서 throw. `vitest.setup.ts` 의 no-op 스텁 유지.
