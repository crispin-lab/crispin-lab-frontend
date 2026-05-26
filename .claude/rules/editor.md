# 에디터 (TipTap)

> **이 문서의 범위**: TipTap 기반 본문 에디터의 확장 구성, `[[페이지명]]` 위키 참조 입력/렌더, 저장 포맷.
>
> **백엔드 모델 정합**: `crispin-lab-backend` 의 `PageLink` 모델 — `(targetPageId: PageId, displayText: String)` 구조.
> **컴포넌트 책임 분리**: `architecture.md`

## 스택

- `@tiptap/react` — React 바인딩
- `@tiptap/starter-kit` — 기본 노드/마크 (paragraph, heading, bold, italic, code, list 등)
- `@tiptap/extension-link` — 외부 URL 링크
- `@tiptap/extension-mention` — `[[...]]` 위키 참조의 베이스

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
  Editor.tsx              # useEditor 셋업 + 확장 wiring
  extensions/
    PageLink.ts           # [[페이지명]] custom Mention extension
    PageLinkSuggestion.ts # mention 의 suggestion (검색 UI) 정의
  PageLinkRenderer.tsx    # rendered HTML 안에서 PageLink 노드의 Client 컴포넌트
```

- `Editor.tsx` 는 Client Component (`'use client'`). TipTap 은 브라우저 전용.
- 확장 (`PageLink`) 은 pure module — Editor 외 다른 곳 (예: viewer) 에서도 같은 확장 set 을 import 해 일관성을 보장.

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

## 자주 빠뜨리는 것

- **`@tiptap/extension-mention` 의 default trigger `@` 를 그대로 사용** — 본 프로젝트는 `[[` 가 위키 링크 트리거. mention 의 `suggestion.char` 를 `[[` 로 명시.
- **에디터를 Server Component 에서 렌더 시도** — TipTap 은 `window` 의존. 반드시 Client Component.
- **`editor.getHTML()` 로 저장** — 위키 링크 attribute 가 깨질 수 있다. 항상 `getJSON()`.
- **새 확장 추가 시 viewer 와 sync 안 함** — Editor 와 Viewer 가 다른 확장 set 을 쓰면 같은 JSON 이 다르게 렌더된다. 확장 list 를 한 module 로 export 해 양쪽에서 import.
- **입력 디바운스 없음** — mention suggestion 이 매 키마다 API 를 두드리면 백엔드 부하 + 응답 race. 디바운스 필수.
