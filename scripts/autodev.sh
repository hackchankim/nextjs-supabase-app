#!/usr/bin/env bash
# 자율 개발 에이전트 팀 — 무인 감독 루프 (supervisor)
#
# /dev:auto-dev(오케스트레이터)를 headless 로 반복 구동한다. 토큰/사용량 한도에
# 걸리면 리셋될 때까지 대기했다가 재호출하고, 프로세스가 죽어도 다음 실행이
# shrimp DB·ROADMAP·git 브랜치/PR 에서 상태를 읽어 이어간다(무손실·멱등 재개).
#
# 실행 방법:
#   - 대화형:   Claude Code 세션에서  /loop /dev:auto-dev
#   - 무인 상주: cron/launchd 로 이 스크립트를 주기 실행 (예: 매시)
#       */30 * * * *  cd /path/to/repo && ANTHROPIC_API_KEY=... scripts/autodev.sh >> autodev.log 2>&1
#
# 권장:
#   - 무인 배치는 구독 주간 상한을 피하려 **API 종량제 키(ANTHROPIC_API_KEY) + 월 지출 상한** 사용.
#   - --bare 는 쓰지 않는다: 이 루프는 shrimp MCP·/dev:auto-dev 커맨드·카카오 훅·CLAUDE.md 가 필요하다.
#   - 안전(브랜치+PR·main 직접 금지·시크릿 가드)은 /dev:auto-dev 와 훅이 이미 보장한다. 이 스크립트는 반복·대기·재개·정지만 담당한다.
#
# 상태 외부화(중요): 이 스크립트는 인메모리 태스크 상태를 갖지 않는다. 강제 종료 후
# 다시 실행하면 새 프로세스가 ROADMAP/shrimp/git 에서 "다음 미완료 태스크"를 읽어 이어간다.
#
# 조절 가능한 환경변수:
#   CLAUDE_CMD           실제 실행 명령 (기본 claude, 테스트 스텁 주입용)
#   AUTODEV_MAX_ITERS    한 실행에서 처리할 태스크 수 (기본 1)
#   AUTODEV_PERMISSION   권한 플래그 (기본 --dangerously-skip-permissions)
#   AUTODEV_DEFAULT_WAIT 리셋 시각 못 구할 때 기본 대기(초, 기본 1800)
#   AUTODEV_MAX_WAIT     대기 상한(초, 기본 3600)
#   AUTODEV_MAX_RETRY    같은 태스크 rate-limit 재시도 상한 (기본 5)

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

CLAUDE_CMD="${CLAUDE_CMD:-claude}"
AUTODEV_MAX_ITERS="${AUTODEV_MAX_ITERS:-1}"
AUTODEV_PERMISSION="${AUTODEV_PERMISSION:---dangerously-skip-permissions}"
AUTODEV_DEFAULT_WAIT="${AUTODEV_DEFAULT_WAIT:-1800}"
AUTODEV_MAX_WAIT="${AUTODEV_MAX_WAIT:-3600}"
AUTODEV_MAX_RETRY="${AUTODEV_MAX_RETRY:-5}"

# 미해결 의사결정(PENDING)이 있는지
has_pending() {
  ls docs/decisions/PENDING-*.md >/dev/null 2>&1
}

# 카카오 알림(실패 무시)
notify() {
  node "$ROOT/scripts/kakao/send.mjs" "$1" >/dev/null 2>&1 || true
}

# ── Pre-flight ──────────────────────────────────────────────
echo "[autodev] 시작: $(date '+%Y-%m-%d %H:%M:%S')"

node "$ROOT/scripts/check-env.mjs" || echo "[autodev] 경고: 카카오 env 미완 — 알림이 드라이런될 수 있습니다."
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "[autodev] 경고: ANTHROPIC_API_KEY 미설정 — 무인 배치는 API 종량제 키를 권장합니다(구독 주간 상한 회피)."
fi

if has_pending; then
  echo "[autodev] 미해결 결정(docs/decisions/PENDING-*.md)이 있어 루프를 시작하지 않습니다."
  notify "[대기] 자율 개발 루프: 미해결 결정이 있어 정지. docs/decisions 확인 요망."
  exit 0
fi

# ── 감독 루프 ───────────────────────────────────────────────
for i in $(seq 1 "$AUTODEV_MAX_ITERS"); do
  echo "[autodev] iteration $i/$AUTODEV_MAX_ITERS"

  retry=0
  while :; do
    LOG="$(mktemp)"
    export CLAUDE_AUTODEV=1   # Stop 훅이 카카오 완료 알림을 보내도록

    # /dev:auto-dev 를 headless 로 구동 (--bare 미사용)
    "$CLAUDE_CMD" -p "/dev:auto-dev" --output-format stream-json --verbose $AUTODEV_PERMISSION 2>&1 | tee "$LOG"
    rc="${PIPESTATUS[0]}"

    # 세션 ID 베스트에포트(재시도 시 --resume 용)
    sid="$(grep -oE '"session_id":"[^"]+' "$LOG" 2>/dev/null | head -1 | cut -d'"' -f4)"

    if [ "$rc" -ne 0 ] && grep -Eiq 'rate.?limit|usage limit|resets|error_status":[[:space:]]*429|error":"rate_limit' "$LOG"; then
      # ── rate-limit / 사용량 한도 → 리셋까지 대기 후 재시도 ──
      retry=$((retry + 1))
      if [ "$retry" -gt "$AUTODEV_MAX_RETRY" ]; then
        echo "[autodev] rate-limit 재시도 상한($AUTODEV_MAX_RETRY) 초과 — 정지."
        notify "[정지] 자율 개발 루프: rate-limit 재시도 초과."
        rm -f "$LOG"
        exit 1
      fi
      # 대기시간: retry_delay_ms(ms) → 초, 없으면 기본, 상한 적용
      ms="$(grep -oE 'retry_delay_ms":[0-9]+' "$LOG" 2>/dev/null | head -1 | grep -oE '[0-9]+')"
      if [ -n "$ms" ]; then wait=$((ms / 1000)); else wait="$AUTODEV_DEFAULT_WAIT"; fi
      [ "$wait" -lt 1 ] && wait=1
      [ "$wait" -gt "$AUTODEV_MAX_WAIT" ] && wait="$AUTODEV_MAX_WAIT"
      echo "[autodev] 한도 감지 → ${wait}s 대기 후 재시도 (retry $retry/$AUTODEV_MAX_RETRY, session=${sid:-none})"
      rm -f "$LOG"
      sleep "$wait"
      continue
    elif [ "$rc" -ne 0 ]; then
      # ── 그 외 에러 → 정지 ──
      echo "[autodev] auto-dev 실패(rc=$rc) — 정지."
      notify "[에러] 자율 개발 루프 실패 (rc=$rc). 로그 확인 요망."
      rm -f "$LOG"
      exit 1
    else
      # ── 정상 종료 ──
      rm -f "$LOG"
      break
    fi
  done

  # 태스크 처리 중 의사결정이 필요해졌으면(PENDING 생성) 정지
  if has_pending; then
    echo "[autodev] 의사결정 필요 — 루프 정지."
    notify "[의사결정 필요] 자율 개발 루프 정지. docs/decisions 확인 요망."
    break
  fi
done

echo "[autodev] 종료: $(date '+%Y-%m-%d %H:%M:%S')"
