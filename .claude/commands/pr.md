현재 feature 브랜치를 origin 에 push 하고 **draft** PR 을 생성한다.

**중요: PR 은 항상 draft 로 생성한다.** `gh pr create` 에 `--draft` 플래그를 반드시 포함한다. 사용자가 ready 상태로 만들고 싶으면 머지 직전에 직접 토글한다.

## 사전 조건

- 브랜치 명명: `feature/LAB-N-짧은-요약` (예: `feature/LAB-54-frontend-bootstrap`)
- main 과 차이 있는 커밋이 1 개 이상
- gh CLI 가 personal 계정으로 인증돼 있어야 함 (`gh auth status` 로 확인. 필요 시 사용자에게 `gh personal` alias 안내)

## 워크플로우

1. **현재 상태 확인**
   - `git branch --show-current` — main 이면 stop. feature 브랜치에서만 동작
   - `git status` — clean 한지 (commit 안 한 변경이 있으면 사용자에게 알리고 stop)
   - `git log --oneline main..HEAD` — main 대비 커밋 목록
2. **push**
   - `git push -u origin <branch>` (이미 push 된 상태면 skip 또는 fast-forward)
3. **PR 메타 추출**
   - 제목: HEAD 커밋의 subject (`git log -1 --format=%s`). `[LAB-N]: ...` 형식 그대로 사용
   - 티켓 번호: 브랜치명에서 `LAB-\d+` 패턴 추출 (예: `LAB-54-frontend-bootstrap` → `LAB-54`)
   - 본문 골격:
     - `.github/pull_request_template.md` 가 있으면 gh 가 자동 적용한다. 비어 있는 섹션은 아래 정보로 채운다.
     - **템플릿이 없으면** 다음 골격을 자체 생성한다:
       ```
       ## 개요
       - <bullets>

       ## 변경 범위
       - <파일·역할 요약>

       ## 검증
       - [x] `pnpm typecheck`
       - [x] `pnpm lint`
       - [x] `pnpm format:check`
       - [x] `pnpm build`

       ## 메모
       <없으면 섹션 삭제>

       ## 관련 티켓
       - [LAB-N](https://crispin09.atlassian.net/browse/LAB-N)
       ```
   - 채울 내용:
     - **개요**: HEAD 커밋 메시지 본문의 bullets 옮김
     - **변경 범위**: `git diff --stat main..HEAD` 기반으로 주요 파일·역할 요약
     - **검증**: 실제로 돌려본 것만 `[x]`, 미완은 `[ ]`
     - **메모**: 의도적 미완·후속 작업이 있으면 작성, 없으면 섹션 삭제
     - **관련 티켓**: 추출한 LAB-N 으로 Jira URL 생성
4. **draft PR 생성**: `gh pr create --draft --title "..." --body "..."`
5. **결과 URL 을 사용자에게 전달**

## 룰

- PR 본문에 Claude / AI / 생성 도구 멘션 금지 (`.claude/rules/commit.md` 동일 원칙)
- 모든 본문은 한국어 (`.claude/rules/docs-style.md`)
- 본문에 가짜 검증 결과를 적지 않는다. 실제로 돌려본 것만 `[x]`
- 자기 리뷰가 필요하면 PR 생성 후 사용자에게 `/code-review` 사용을 제안

## 머지 후 정리 (사용자가 머지한 뒤 실행 시)

- `git checkout main && git pull origin main`
- `git branch -D <feature-branch>` (squash 머지면 -d 로 안 지워짐)
- 원격 브랜치는 GitHub 의 자동 삭제 설정에 맡기거나 `git push origin --delete <branch>`
