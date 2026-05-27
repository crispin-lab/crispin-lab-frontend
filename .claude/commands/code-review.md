`code-reviewer` 서브에이전트를 통해 현재 변경사항에 대한 코드 리뷰를 실행한다.

## 리뷰 범위 결정

1. 사용자가 파일 경로를 넘기면 (예: `/code-review src/lib/api/client.ts`) 그 파일들을 리뷰한다.
2. 커밋 범위/ref 가 주어지면 (예: `HEAD~3..HEAD`, SHA, 브랜치 이름) 그 범위를 리뷰한다.
3. PR 번호가 주어지면 (예: `#42`) `gh pr diff` 로 diff 를 받아 리뷰한다.
4. 인자가 없으면 working tree 전체: staged + unstaged + untracked 변경 (`git status` + `git diff HEAD`).

## 에이전트 호출

`code-reviewer` 서브에이전트에 다음을 전달한다:

- 리뷰 범위에 대한 짧은 설명
- 자기-완결적 프롬프트:
  - 무엇을 리뷰할지 (파일/범위/"working tree")
  - 사용자가 함께 준 컨텍스트 (예: "X 를 리팩터링 중 — Y 불변식이 깨지지 않았는지에 집중")
  - 프로젝트 룰 문서는 `.claude/rules/` 에 정리되어 있다 (`architecture.md`, `conventions.md`, `ui.md`, `state.md`, `comments.md`, `api-client.md`, `auth.md`, `editor.md`, `commit.md`, `docs-style.md`). 리뷰 시 반드시 참고하도록 명시. 새 룰 추가 시 본 목록도 `.claude/CLAUDE.md` 인덱스와 함께 갱신.

에이전트는 foreground 로 실행하고, 그 결과가 응답을 결정한다.

## 결과 전달

에이전트 결과를 **그대로** 사용자에게 전달한다. 심각도 분류와 `file:line` 참조를 보존하고, 임의로 풀어쓰지 않는다.

발견사항이 없다고 보고하면 그대로 말한다. 없는 피드백을 만들어내지 않는다.

## convention-check 와의 차이

- `convention-check`: 룰 문서 (`conventions.md`, `architecture.md`) 기준 체크리스트성 검토. PR 직전 사전 리뷰용.
- `code-review`: 시니어 리뷰어 관점에서 정확성·보안·동시성·관용구를 보는 자유 리뷰. 룰 외 품질 근거도 활용.

둘은 보완 관계. 큰 PR 은 둘 다 돌릴 수 있다.
