---
description: '자율 개발 루프 — ROADMAP의 다음 태스크 1건을 shrimp로 계획·구현·리뷰·QA한 뒤 브랜치에 커밋한다(push는 사용자가 나중에 일괄 처리)'
allowed-tools:
  [
    'Task',
    'Read',
    'Edit',
    'Write',
    'Bash(git:*)',
    'Bash(npm run lint:*)',
    'Bash(npm run typecheck:*)',
    'Bash(node scripts/kakao/*)',
    'Bash(gh:*)',
  ]
---

# /dev:auto-dev — 자율 개발 루프 (한 번 호출 = 태스크 1건)

> ⚠️ **이 커맨드는 실제 개발을 시작합니다.** 코드를 만들고 브랜치에 커밋합니다(push·PR은 이 루프에서 하지 않음).
> D001~D004에서 만든 부품(카카오 알림·시크릿 가드·게이트·qa-tester)을 엮어 ROADMAP의
> **다음 미완료 태스크 1건**을 처리합니다. 로직을 새로 만들지 말고 **기존 부품을 호출**하세요.

## 0. 안전 전제 (위반 시 즉시 중단)

- ❌ **`main`에 직접 커밋/병합/push, force push 절대 금지.** 작업은 **새 브랜치에 커밋만** 한다. push·PR·`main` 병합은 사람이 나중에 처리한다.
- ❌ **`git add .` 금지.** 의도한 파일만 스테이징한다(시크릿은 `pre-commit-guard`가 차단).
- **한 번 호출 = 태스크 1건**만 처리하고 멈춘다(무한 진행 금지).
- 되돌리기 어려운 결정·모호함·QA 반복 실패 → **12단계(의사결정 게이트)**로 정지한다.

## 1. Pre-flight

- `git status`로 워킹 트리를 확인한다(더러우면 정리 후 진행).
- 현재 브랜치를 확인한다. `main`이면 4단계에서 작업 브랜치를 만든다.
- **먼저 `docs/decisions/`에 `PENDING-*.md`가 있으면**, 새 태스크를 시작하지 말고 그 안건의 `## 결정`이 채워졌는지 확인한다. 미결이면 카카오로 리마인드하고 정지, 결정됐으면 그 결정을 반영해 해당 작업부터 재개한다.

## 2. ROADMAP에서 다음 태스크 식별

- `docs/ROADMAP.md`를 읽어 **첫 미완료(제목에 ✅ 없는) 태스크**와 소속 **Phase**를 찾는다. (Phase 0 다음은 Phase 1 Task 001 …)

## 3. shrimp 태스크 큐 (멱등)

- `list_tasks`로 해당 Phase의 pending 태스크가 이미 있는지 확인한다.
- 없으면 `plan_task("Phase N: <Phase 제목>", @docs/ROADMAP.md)` → (필요 시 analyze/reflect/split) 로 태스크를 생성한다. **이미 있으면 다시 만들지 않는다.**
- `list_tasks`에서 **의존성이 풀린 다음 pending 1건**을 고른다.

## 4. 작업 브랜치 생성

- `git switch -c auto/<task-slug>` (짧은 kebab 슬러그). 이후 모든 커밋은 이 브랜치에만.

## 5. 구현 — 서브에이전트 위임

- `execute_task(<id>)`로 지침을 받고, 태스크 성격에 맞는 서브에이전트에 **Task 도구로 위임**한다:

  | 태스크 성격 | 위임 대상 |
  |---|---|
  | 라우트/페이지 골격·레이아웃 | `nextjs-app-developer` |
  | 정적 UI/마크업·스타일 | `ui-markup-specialist` |
  | Supabase·DB·API·서버 액션·인증 | `nextjs-supabase-expert` |
  | ROADMAP/문서 | `development-planner` / `prd-*` |

## 6. 게이트

- `npm run lint && npm run typecheck` 를 통과시킨다. 실패하면 5단계로 돌아가 고친다.
- 실행 가능한 UI/기능이면 개발 서버 스모크(6.5의 qa-tester가 담당).

## 7. 정적 리뷰 — code-reviewer

- `code-reviewer` 서브에이전트에 위임해 방금 변경분을 리뷰받고, 지적사항을 반영한다.

## 8. 동적 QA — qa-tester

- `qa-tester` 서브에이전트에 위임해 앱을 실제로 띄워 대상 태스크의 "테스트 체크리스트"를 구동·판정받는다.
- **fail이면 5단계로 돌아가 수정 후 재시도 (최대 2회).** 2회 초과로도 fail이면 **12단계**로 간다.

## 9. verify → 커밋 (브랜치, push 안 함)

- `verify_task(<id>)`로 shrimp 태스크를 완료 처리한다.
- `/git:commit` 규약(이모지+컨벤셔널, Claude 서명 금지, 의도한 파일만)으로 **작업 브랜치에** 커밋한다.
- ❌ **이 루프에서 `git push`·PR 생성은 하지 않는다.** 여러 태스크의 커밋을 브랜치에 쌓아두고, **사람이 나중에 `/git:push`로 일괄 push**한 뒤 GitHub에서 PR을 연다. (push가 자격증명을 물어 무인/연속 흐름을 끊기 때문)

## 10. ROADMAP 동기화

- `/docs:update-roadmap` 규약으로 해당 태스크를 `✅`로 표시(shrimp 상태 ↔ ROADMAP 체크마크 일치).

## 11. 완료 알림

- `node scripts/kakao/send.mjs "[완료] <태스크명> 커밋 완료 (브랜치 auto/<task-slug>) · push 대기"` 로 카카오 알림을 보낸다. (대화형 세션에서 사람이 지켜보는 중이면 생략 가능)
- 여기서 **정지**한다(다음 태스크는 다음 호출에서).

## 12. 의사결정 게이트 (정지 + 사람 개입)

아래 상황이면 **강행하지 말고** `docs/decisions/`에 `PENDING-<slug>.md`(템플릿은 `docs/decisions/README.md`)를 남기고, `node scripts/kakao/send.mjs "[의사결정 필요] <요약> — docs/decisions/PENDING-<slug>.md"` 로 알린 뒤 **정지**한다:

- **비가역**: DB 스키마 변경, 외부 서비스 연동, 데이터 삭제 등.
- **모호**: 스펙만으로 판단이 갈리고 코드·문서 확인으로도 안 풀리는 지점.
- **QA 반복 실패**: qa-tester가 2회 재시도 후에도 fail (결함 재현 절차를 리포트로 남긴다).

사람이 `## 결정`을 채우면 다음 `/dev:auto-dev` 호출이 1단계에서 이를 읽어 재개한다.
