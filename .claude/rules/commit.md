# 커밋 메시지

- `Co-Authored-By:` 라인을 포함하지 않는다.
- Claude, AI 어시스턴트, 생성 도구 같은 표현을 메시지 어디에도 넣지 않는다.
- Subject 형식: `[LAB-N]: 한국어 제목` (LAB-N 은 Jira 티켓 번호). 70 자 이내.
  - 예외: 티켓이 어색한 메타·툴링 변경(예: PR 템플릿 추가, `.gitignore` 정리)은 `[chore]: 한국어 제목` 사용 가능. 자주 쓰지 말고, 의미 있는 작업은 티켓을 먼저 만든다.
- 본문은 한국어 불릿 리스트 형식. 각 항목은 *왜* 그 변경이 필요한지를 설명하고, 단순한 *무엇* 나열은 피한다.
- 여러 줄 메시지를 `git commit -m` 에 넘길 때는 HEREDOC 을 사용해 포맷을 보존한다.
- 파일은 이름으로 명시 스테이징한다. `git add -A` / `git add .` 는 시크릿, 빌드 산출물, 무관한 파일이 끼어들 위험이 있어 피한다.
- pre-commit / pre-push hook 실패 시 원인을 고친 뒤 **새 커밋**을 만든다. 실패한 커밋을 `--amend` 하거나 `--no-verify` 로 우회하지 않는다.
- 사용자가 명시적으로 요청하지 않는 한 push 하지 않는다.

## Jira 라벨

본 레포는 프론트 전용이다. 같은 [LAB-N] 티켓 흐름을 백엔드 레포 (`crispin-lab-backend`) 와 공유하되, Jira 티켓에 `FE` 라벨을 붙여 백/프론트 작업을 구분한다. 새 티켓을 만들 때 라벨 부착을 잊지 않는다.

## HEREDOC 예시

```bash
git commit -m "$(cat <<'EOF'
[LAB-54]: Next.js 프로젝트 부트스트랩 + 룰 문서

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui 로 초기 골격을 세움.
- TanStack Query / TipTap 등 도메인 의존성을 함께 잠가둔 이유는 의존성 격차를 줄여 이후 PR 비용을 낮추기 위함.
- `.claude/` 룰 문서를 백엔드 레포 정신과 맞춰 8 개로 분리. 컨벤션이 PR 리뷰에 자연 합류하도록 한다.
EOF
)"
```
