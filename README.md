# crispin-lab-frontend

`crispin-lab` 의 Next.js 프론트엔드. 백엔드 (`crispin-lab-backend`) 와 같은 `[LAB-N]` 티켓 흐름을 공유한다.

## 스택

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui
- TanStack Query (v5)
- TipTap (위키 본문 에디터)
- pnpm + Node 24 (`.nvmrc`)

## 시작

```bash
pnpm install
cp .env.example .env.local       # 값 채우기
pnpm dev
```

기본 포트 [http://localhost:3000](http://localhost:3000).

## 환경 변수

| 이름                  | 위치            | 설명                                          |
| --------------------- | --------------- | --------------------------------------------- |
| `BACKEND_URL`         | 서버 전용       | BFF Route Handler 가 백엔드를 호출할 base URL |
| `NEXT_PUBLIC_APP_URL` | 클라이언트 노출 | 자기 자신의 public URL (redirect, OG meta)    |

`.env*` 는 `.gitignore` 됨. 값은 `.env.local` 에. 단 `.env.example` 은 커밋된다.

## 룰 문서

코딩 컨벤션·아키텍처·인증 등 프로젝트 룰은 `.claude/rules/` 에 토픽별로 분리되어 있다. 인덱스는 `.claude/CLAUDE.md`.

## 백엔드 연동

- API 타입은 백엔드의 `restdocs-api-spec` 산출물 (`openapi3.json`) 로부터 자동 생성 (`pnpm api:gen` 도입 예정).
- 인증은 httpOnly cookie + BFF 어댑터 패턴. 자세한 흐름은 `.claude/rules/auth.md`.
