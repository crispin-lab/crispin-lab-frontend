# 인증 / 세션

> **이 문서의 범위**: 백엔드 세션 토큰의 프론트 처리, BFF 어댑터, 인증 실패 흐름.
>
> **API 호출 일반 규칙**: `api-client.md`

## 백엔드 인증 모델 (요약)

- 세션 토큰: `Authorization: Bearer sess_<43-base64>`
- 발급/조회: Redis 세션 store, sliding expiry (요청마다 TTL 갱신)
- 옵셔널 인증 endpoint: 토큰이 없으면 anonymous, 있는데 invalid 면 401
- 모든 인증 실패가 단일 `INVALID_SESSION` 코드로 떨어짐 (헤더 누락/형식 오류/세션 미존재 차이 비공개 — IDOR / enumeration 방어)

자세한 백엔드 흐름은 `crispin-lab-backend/.claude/rules/controller.md` 의 "Auth 인증 컨텍스트 추출" 절 참조.

## 프론트 토큰 보관 — httpOnly cookie + BFF 어댑터

### 채택 결정 정리

| 옵션 | XSS | CSRF | 새로고침 | 백엔드 호환 |
|------|-----|------|----------|-------------|
| `localStorage` + Authorization 헤더 | 취약 (JS 가 읽음) | 안전 | 그대로 유지 | 무수정 |
| 메모리 + Authorization 헤더 | 안전 | 안전 | 잃음, refresh flow 필요 | 무수정 |
| **httpOnly cookie + BFF 어댑터** | 안전 (JS 가 못 읽음) | SameSite=Lax 로 차단 | 그대로 유지 | 무수정 (BFF 가 변환) |

→ **httpOnly cookie + BFF 어댑터 채택**. XSS 와 새로고침 양쪽 모두 안전하고, 백엔드 세션 모델 (sliding expiry) 과 자연 정합.

### BFF (Backend-for-Frontend) 어댑터 패턴

Next.js Route Handler (`src/app/api/.../route.ts`) 가 프론트 ↔ 백엔드 어댑터 역할:

```
[브라우저]              [Next.js BFF]              [백엔드]
  cookie: session=sess_xxx
      ──── 요청 ────►   cookies().get('session')
                       ──── Authorization: Bearer sess_xxx ────►
                       ◄──────── 200 / 401 ────────────────────
      ◄─── 응답 ────   (필요 시 Set-Cookie 갱신)
```

핵심 책임:
1. cookie ↔ `Authorization: Bearer` 헤더 변환
2. 로그인/로그아웃 시 `Set-Cookie` 발급/삭제
3. 백엔드 응답 (status + body) 그대로 전달 — 가공하지 않음. 클라이언트는 `ApiError.status === 401` + `code === 'INVALID_SESSION'` 으로 분기 (아래 "인증 실패 처리" 참조)

### Cookie 속성

```ts
const isProd = process.env.NODE_ENV === 'production'

const sessionCookie = {
  name: 'session',
  httpOnly: true,
  secure: isProd,                     // 로컬 (HTTP) 은 false, production (HTTPS) 만 true
  sameSite: 'lax' as const,           // GET 외 cross-site 요청에 cookie 미전송
  path: '/',
  // maxAge 는 백엔드 sliding expiry 와 맞추지 않는다 — session cookie (브라우저 닫으면 삭제) 로 두고
  // 서버 측 sliding 만 신뢰. 명시 만료가 필요하면 백엔드 응답에 expires-at 을 받아 그때만 갱신.
}
```

- `SameSite=Lax`: 일반 GET navigation 에는 cookie 가 동봉되지만, cross-site `fetch` / form POST 에는 미전송 → CSRF 1 차 방어.
- `Secure`: HTTPS 전용. 로컬 개발 (HTTP) 에서는 환경 변수 분기로 false.
- CSRF 추가 방어: state-changing 요청 (POST/PUT/DELETE) 은 `X-Requested-With: fetch` 같은 커스텀 헤더 또는 double-submit token 으로 한 겹 더. SameSite=Lax 만으로도 대부분 케이스에서 충분하지만 본 결정은 도입 시점에 별도 검토.

## 로그인 / 로그아웃 흐름

### 로그인 (`POST /api/auth/login` BFF Route Handler)

```ts
// src/app/api/auth/login/route.ts (개요)
export async function POST(request: Request) {
  const body = await request.json()
  const upstream = await fetch(`${process.env.BACKEND_URL}/v1/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!upstream.ok) {
    return Response.json(await upstream.json(), { status: upstream.status })
  }

  const { sessionToken } = await upstream.json()
  const isProd = process.env.NODE_ENV === 'production'
  const response = Response.json({ ok: true })
  response.headers.set(
    'Set-Cookie',
    `session=${sessionToken}; HttpOnly; ${isProd ? 'Secure; ' : ''}SameSite=Lax; Path=/`,
  )
  return response
}
```

- 클라이언트는 토큰 자체를 보지 못한다 — `ok: true` 만 받는다.
- 백엔드 에러 (`INVALID_CREDENTIALS` 등) 는 그대로 status / body 패스스루.

### 로그아웃

```ts
// src/app/api/auth/logout/route.ts
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session')?.value

  // 백엔드 세션 destroy 호출 (best-effort)
  if (sessionToken) {
    await fetch(`${process.env.BACKEND_URL}/v1/sessions/me`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${sessionToken}` },
    }).catch(() => { /* 네트워크 실패해도 cookie 는 지운다 */ })
  }

  const response = Response.json({ ok: true })
  response.headers.set('Set-Cookie', 'session=; Max-Age=0; Path=/')
  return response
}
```

### catch-all BFF (`/api/[...path]`)

여러 endpoint 마다 Route Handler 를 따로 만들지 않고, catch-all 한 개로 패스스루한다. cookie↔Bearer 변환 책임이 있는 본 catch-all 외에 **endpoint 별 단순 프록시 route handler 는 만들지 않는다** (`architecture.md` 의 "route handler 정책" 절 참조).

```ts
// src/app/api/[...path]/route.ts (개요)
import { cookies } from 'next/headers'

async function proxy(
  request: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session')?.value
  const upstreamUrl = `${process.env.BACKEND_URL}/${path.join('/')}`

  const headers = new Headers(request.headers)
  headers.delete('cookie')
  if (sessionToken) headers.set('Authorization', `Bearer ${sessionToken}`)

  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body: request.body,
  })

  // 401 일 때는 클라이언트가 일관되게 처리하도록 정규화
  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  })
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE }
```

호출부는 `apiFetch('/api/pages/123')` 처럼 같은 origin 만 알면 된다. 백엔드 base URL 도 클라이언트에 노출 안 됨.

- Next 16 의 `cookies()` 와 `params` 는 모두 async. `await` 누락 시 타입 에러.
- 본 catch-all 은 cookie↔Bearer 변환·헤더 정리·응답 정규화 외 **body 변형을 하지 않는다**. body 가공이 필요해지면 그 시점에 그 endpoint 만 별도 route handler 로 분리하고, 분리 사유 (응답 정규화, 권한 추가 검증 등) 를 주석 한 줄로 남긴다.

## 인증 실패 처리

### 401 응답을 받으면 어떻게 할까

- 글로벌 fetch 래퍼 (`apiFetch`) 에서 401 을 받으면 클라이언트 측에서 한 곳에 모아 처리:
  - TanStack Query 의 `QueryCache` 의 `onError` 에서 `if (error instanceof ApiError && error.status === 401)` 분기.
  - `router.push('/login?redirect=' + currentPath)` + toast.
- **silently null 로 떨어뜨리지 않는다** — 사용자가 만료 상태에서 빈 화면을 보면 재로그인 트리거가 안 걸린다.
- 동시 다발 401 이 떠도 redirect 는 한 번만 (debounce 또는 redirect flag).

### 옵셔널 인증 endpoint

비로그인도 볼 수 있는 GET endpoint (예: PUBLIC 페이지 조회):
- BFF 가 cookie 가 없으면 `Authorization` 헤더를 안 붙이고 호출 → 백엔드가 anonymous 흐름.
- cookie 가 있는데 백엔드가 401 (만료/위변조) → 401 그대로 패스스루, 클라이언트는 재로그인 흐름.

### 403 / 404 — PRIVATE 페이지 존재 비노출

PRIVATE 페이지에 권한이 없는 사용자가 접근하면 백엔드가 403 또는 404 를 줄 수 있다. 프론트는 **둘을 동일하게 흡수해 `notFound()` 로 보낸다**.

- Server Component: `if (error.status === 403 || error.status === 404) notFound()`. 403 만 별도로 `/forbidden` 등으로 보내지 않는다.
- 글로벌 `not-found.tsx` 의 문구는 "권한" 류 단어를 쓰지 않는다 — 권한 부재와 미존재를 한 화면으로 묶어 페이지 존재 여부 자체를 누출하지 않는 것이 목적 (`design.md` 와이어프레임 02 의 "비로그인 PRIVATE 접근 시 404" 정합).
- Client Component 의 query 404 는 컴포넌트별 inline UI 또는 redirect. mutation 404 는 사용자 액션 실패라 글로벌 toast 가 그대로 받는다.

## Server Component 에서 인증

```tsx
// app/(dashboard)/pages/[pageId]/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function PageDetail({
  params,
}: {
  params: Promise<{ pageId: string }>
}) {
  const { pageId } = await params
  const cookieStore = await cookies()
  if (!cookieStore.get('session')) redirect('/login')

  // apiFetchServer 가 내부적으로 cookie 를 읽어 Bearer 변환한다 (api-client.md)
  const page = await apiFetchServer<Page>(`/v1/pages/${pageId}`)
  return <PageEditor initialPage={page} />
}
```

- Next 16 에서 `cookies()` 와 dynamic route 의 `params` 는 모두 async — `await` 누락 시 타입 에러.
- Server Component 에서 `apiFetchServer` 를 호출하면 cookie → Bearer 변환은 래퍼가 처리. 호출부에서 `headers: { Authorization: ... }` 를 직접 붙이면 이중 헤더가 된다.
- 또는 같은 BFF 를 호출 (`fetch('/api/pages/123')`) — 단일 인증 흐름이 더 단순하지만 한 hop 추가.
- 단순성 우선: 초반에는 모든 경로를 BFF 패스스루로. 성능 이슈가 생기면 Server Component 직접 호출 도입.

## 환경 변수

| 이름 | 위치 | 비고 |
|------|------|------|
| `BACKEND_URL` | 서버 전용 | BFF 가 백엔드를 호출할 base URL. `NEXT_PUBLIC_` 안 붙임. |
| `NEXT_PUBLIC_APP_URL` | 클라이언트 노출 | redirect 등에 쓰는 자기 자신 URL. |

`.env.example` 에 위 두 개 + 빈 placeholder 만 추가.

## 자주 빠뜨리는 것

- **클라이언트 측에서 cookie 읽기 시도** — httpOnly 라 `document.cookie` 로 안 보인다. 인증 여부 판별은 백엔드 응답 (401) 또는 별도 `/api/auth/me` endpoint 로.
- **`localStorage` 로 회귀** — "간단하니까" 라며 토큰을 localStorage 로 옮기지 않는다. XSS 한 방에 탈취.
- **`cookies()` / `params` 의 `await` 누락** — Next 16 에서는 둘 다 async. 동기 호출 코드를 복사해 오면 즉시 깨진다.
- **BFF Route Handler 가 백엔드 응답을 가공** — 단순 패스스루 + 헤더 변환만. body 변형은 클라이언트가 일관되게 처리하는 데 방해.
- **endpoint 별 단순 프록시 route handler 추가** — catch-all (`[...path]/route.ts`) 이 같은 일을 한다. 별도 분리는 변환 책임이 추가될 때만 (`architecture.md` 의 "route handler 정책").
- **`SameSite=None`** — cross-site 가 필요한 시나리오가 없는 이상 절대 None 으로 풀지 않는다. CSRF 1 차 방어가 사라진다.
- **로컬에서 `Secure` 강제 → cookie 미설정** — 로컬 (HTTP) 은 Secure false 로 분기. production 만 true.
