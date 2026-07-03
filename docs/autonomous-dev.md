# 자율 개발 에이전트 팀 — 사용설명서

이 저장소는 개발자가 자리를 비워도 **스스로 개발 → 코드리뷰 → QA → PR**을 진행하고, 중요 시점에 **카카오톡으로 알리는** 자율 개발 시스템(Phase 0)을 갖추고 있다. 이 문서는 그 시스템의 단일 진입점이다. (설계 배경: `docs/PRD.md` Part 0 · 산출물 목록: `docs/ROADMAP.md` Phase 0)

---

## 1. 아키텍처 개요

핵심은 슬래시 커맨드 **`/dev:auto-dev`** 로, ROADMAP의 다음 태스크 1건을 아래 파이프라인으로 처리한다:

```
트리거(로컬 /loop·cron  또는  GitHub @claude)
  → ① ROADMAP에서 다음 미완료 태스크 식별
  → ② shrimp plan_task → ③ list_tasks → ④ execute_task (서브에이전트 위임)
  → 게이트(lint · typecheck [· build])
  → code-reviewer(정적) → qa-tester(동적, fail 시 최대 2회 재시도)
  → verify_task → 새 브랜치 커밋 → push → PR(gh 또는 compare URL)
  → docs:update-roadmap 동기화 → 카카오 완료 알림
  ↳ 비가역 결정/모호/QA 반복 실패 → docs/decisions/PENDING 남기고 정지
```

**한 번 호출 = 태스크 1건.** `main` 병합·배포는 사람이 승인한다.

---

## 2. 역할 분담

### 서브에이전트 (`.claude/agents/`)
| 에이전트 | 역할 |
|---|---|
| `nextjs-app-developer` | 라우트/페이지 골격·레이아웃 |
| `ui-markup-specialist` | 정적 UI/마크업·스타일 |
| `nextjs-supabase-expert` | Supabase·DB·API·서버 액션·인증 |
| `code-reviewer` | 정적 코드 리뷰 |
| `qa-tester` | 동적 QA(앱 실행 + Playwright MCP) |
| `development-planner` / `prd-*` | ROADMAP·PRD 문서 |

### 스크립트 (`scripts/`)
| 파일 | 역할 |
|---|---|
| `kakao/send.mjs` | 카카오 "나에게 보내기" 발송(401→refresh 재시도) |
| `kakao/refresh.mjs` | 액세스 토큰 자동 갱신 |
| `kakao/issue-token.mjs` | 최초 토큰 발급(부트스트랩) |
| `check-env.mjs` | 필수 env 검증(fail-fast) |
| `setup.sh` | 원클릭 온보딩 |
| `autodev.sh` | 무인 감독 루프(headless 반복·재개 보장) |

### 커맨드 / 훅
| 항목 | 역할 |
|---|---|
| `/dev:auto-dev` | 오케스트레이터(위 파이프라인) |
| `git:commit` · `git:push` · `docs:update-roadmap` | 커밋·푸시·진행판 동기화 |
| `.claude/hooks/notify.sh` | Stop/Notification 훅 → 카카오 알림 |
| `.claude/hooks/pre-commit-guard.sh` | 커밋 시크릿 스캔 차단(에이전트·사람 양쪽) |

---

## 3. 두 트랙

시스템은 두 실행 표면을 갖는다.

### 로컬 트랙 (완전 자율)
- 실행: 대화형 `/loop /dev:auto-dev` 또는 무인 `scripts/autodev.sh`(cron/launchd).
- shrimp Task Manager로 태스크를 계획·실행하고, 카카오로 진행을 남기며, 토큰 한도 초과 시 리셋까지 대기 후 재개(무손실·멱등).

### 클라우드 트랙 (반자율, GitHub Actions)
- `@claude` 멘션(`claude.yml`): 이슈/PR에 `@claude`로 지시 → 구현·PR.
- PR 자동 리뷰(`claude-review.yml`): PR 열림/갱신 시 코드리뷰 코멘트.
- CI 게이트(`ci.yml`): `lint + typecheck + build` (+ 스케줄 하트비트).

### ⚠️ 한계 (정직하게)
- **shrimp MCP는 로컬 전용**(로컬 노드 프로세스)이라 **GitHub 러너에서는 못 쓴다.** 따라서 **클라우드에서는 shrimp 기반 `/dev:auto-dev` 자율 루프를 돌릴 수 없다.** 완전 자율 루프는 **로컬 트랙(autodev.sh)** 전용이고, 클라우드는 `@claude`·리뷰·CI로 사람이 트리거하는 반자율이다.
- **카카오 "나에게 보내기"는 푸시 알림이 오지 않는다**(내가 나에게 보낸 메시지라 읽음 처리). 현재는 **기록용 로그**로 쓴다("나와의 채팅"에서 확인). 실시간 푸시가 필요하면 추후 **Telegram 봇** 등을 발송기로 추가한다(`notify.sh → 발송기` 구조라 교체·병행 용이).
- 클라우드 트랙은 카카오를 와이어링하지 않았다(러너에 시크릿 파일 없음). 클라우드 통지는 GitHub 네이티브 PR/코멘트를 쓴다.
- CI에는 Playwright 잡이 없다(`@playwright/test` 미도입). 동적 QA는 `qa-tester` 에이전트가 담당한다.

---

## 4. 처음 세팅 (5분)

1. **온보딩 스크립트**: `bash scripts/setup.sh` — clone 직후 한 명령. **npm 의존성 설치(`npm ci`)** + `.env*.local` 템플릿 복사 + 네이티브 git 시크릿 가드 설치 + 체크리스트 출력.
2. **Supabase**: `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 입력.
3. **카카오 토큰**(로컬 알림용): 카카오 디벨로퍼스 앱 생성 → REST API 키 → 카카오 로그인 `talk_message` 동의 → 인가 코드로 `node scripts/kakao/issue-token.mjs --code <CODE>` 실행(값은 `.env.autodev.local`에). 브라우저 동의는 세션에서 `! <command>`로 직접 실행.
4. **GitHub Actions**(클라우드용): [GitHub App 설치](https://github.com/apps/claude) + repo Settings → Secrets에 `ANTHROPIC_API_KEY` 등록.
5. (권장) 무인 배치는 **API 종량제 키 + 월 지출 상한**을 쓴다(구독 주간 상한 회피).

> 시크릿은 절대 커밋하지 않는다. `.env*.local`은 gitignore + `pre-commit-guard`가 이중으로 막는다.

---

## 5. 실행법

- **대화형 자율**: Claude Code 세션에서 `/loop /dev:auto-dev` (한 번씩 `/dev:auto-dev`도 가능).
- **무인 상주**: `scripts/autodev.sh` (cron/launchd). 예:
  ```
  */30 * * * *  cd /path/to/repo && ANTHROPIC_API_KEY=... scripts/autodev.sh >> autodev.log 2>&1
  ```
  조절: `AUTODEV_MAX_ITERS`, `AUTODEV_PERMISSION`, `AUTODEV_DEFAULT_WAIT`, `AUTODEV_MAX_WAIT` 등.
- **클라우드**: 이슈/PR 코멘트에 `@claude ...`. PR을 열면 자동 리뷰·CI 게이트가 붙는다.

---

## 6. 의사결정 게이트

에이전트가 스스로 결정하면 안 되는 지점(비가역 결정·모호한 요구·QA 반복 실패)에 도달하면, **강행하지 않고** `docs/decisions/PENDING-<slug>.md`에 질문/결함 리포트를 남기고 **카카오 알림 + 루프 정지**한다. 사람이 파일의 `## 결정`을 채우면 다음 `/dev:auto-dev`가 읽어 재개한다. 프로토콜·템플릿: `docs/decisions/README.md`.

---

## 7. 안전 원칙

- 에이전트는 **새 브랜치에만 커밋 + PR 생성**. `main` 직접 커밋/병합/force push **금지**. `main` 병합은 사람 승인.
- **`git add .` 금지** — 의도한 파일만 스테이징.
- 시크릿(카카오·GitHub·Supabase 키)은 **절대 커밋하지 않는다**(`pre-commit-guard`가 차단).
- 되돌리기 어려운 작업은 자동화하지 않고 **의사결정 게이트**로 사람에게 넘긴다.

---

## 8. 과금

- **Anthropic API**: 무인 배치는 종량제 키 + **월 지출 상한** 권장(구독 주간 상한을 피함). 프롬프트/응답 토큰량에 비례.
- **GitHub Actions**: GitHub 호스티드 러너 분(minutes)을 소비한다. `claude_args --max-turns`·`timeout-minutes`·`concurrency`로 상한을 둔다.
- 비용 통제: 로컬 트랙은 사용량 한도 감지 시 리셋까지 대기(폭주 방지), 클라우드 트랙은 워크플로우 타임아웃·동시성 취소로 억제.
